// Blog engagement API — single Lambda behind a Function URL.
// Routes (method + path):
//   GET  /posts/{slug}                 -> { upvotes, voted?, comments: [...] }
//   POST /posts/{slug}/upvote          -> { upvotes, voted }   body: { voterId, action: "up"|"down" }
//   POST /posts/{slug}/comments        -> { comment }          body: { name, body, hp }
//
// Storage: one DynamoDB table, single-table style.
//   PK              SK                     attrs
//   POST#<slug>     META                   upvotes (Number)
//   POST#<slug>     VOTER#<voterId>        v (1)                  -- dedup, one row per browser id
//   POST#<slug>     COMMENT#<ts>#<rand>    name, body, createdAt, visible
//
// Design notes:
//  - No API Gateway: Function URL invokes this with the "2.0" payload shape.
//  - Upvote dedup is per-browser (voterId is a random uuid in localStorage). This is
//    spoofable by design — acceptable for a personal blog, matches "minimal moderation".
//  - Comments are stored visible:true. Self-moderate by flipping visible or deleting the item.

import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.TABLE_NAME;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

// CORS allowlist. Origins that may call this API.
const ALLOWED_ORIGINS = new Set([
  'https://hejonathan.com',
  'https://www.hejonathan.com',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
]);

// Limits.
const MAX_NAME = 60;
const MAX_BODY = 2000;
const COMMENT_COOLDOWN_MS = 30 * 1000; // per-IP, best-effort

const pk = (slug) => `POST#${slug}`;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://hejonathan.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
}

const json = (status, body, origin) => ({
  statusCode: status,
  headers: corsHeaders(origin),
  body: JSON.stringify(body),
});

// Strip control chars, trim, clamp length.
function clean(input, max) {
  return String(input ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

// slug: allow the shapes Jekyll produces (page.slug or a URL path fallback).
function validSlug(s) {
  return typeof s === 'string' && s.length > 0 && s.length <= 200 && /^[a-zA-Z0-9/_-]+$/.test(s);
}

export const handler = async (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin || '';
  const method = event?.requestContext?.http?.method || 'GET';
  const rawPath = event?.rawPath || '/';

  if (method === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  if (!TABLE) return json(500, { error: 'server_misconfigured' }, origin);

  // Parse /posts/{slug}[/upvote|/comments]. slug may contain slashes, so match greedily then trim the action.
  const m = rawPath.match(/^\/posts\/(.+?)(\/upvote|\/comments)?\/?$/);
  if (!m) return json(404, { error: 'not_found' }, origin);
  const slug = decodeURIComponent(m[1]);
  const action = m[2]; // undefined | "/upvote" | "/comments"
  if (!validSlug(slug)) return json(400, { error: 'bad_slug' }, origin);

  let body = {};
  if (event?.body) {
    try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body); }
    catch { return json(400, { error: 'bad_json' }, origin); }
  }

  try {
    if (method === 'GET' && !action) return await getPost(slug, origin);
    if (method === 'POST' && action === '/upvote') return await upvote(slug, body, origin);
    if (method === 'POST' && action === '/comments') return await postComment(slug, body, event, origin);
    return json(405, { error: 'method_not_allowed' }, origin);
  } catch (err) {
    console.error('handler_error', { slug, action, method, err: err?.message });
    return json(500, { error: 'internal' }, origin);
  }
};

async function getPost(slug, origin) {
  // Meta (upvote count).
  const meta = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: pk(slug), SK: 'META' },
  }));
  const upvotes = meta.Item?.upvotes ?? 0;

  // Comments — SK begins_with COMMENT#, chronological (SK sorts by ts).
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :c)',
    ExpressionAttributeValues: { ':pk': pk(slug), ':c': 'COMMENT#' },
    ScanIndexForward: true,
    Limit: 500,
  }));
  const comments = (res.Items || [])
    .filter((it) => it.visible !== false)
    .map((it) => ({ name: it.name, body: it.body, createdAt: it.createdAt }));

  return json(200, { slug, upvotes, comments }, origin);
}

async function upvote(slug, body, origin) {
  const voterId = clean(body.voterId, 64);
  const dir = body.action === 'down' ? 'down' : 'up';
  if (!voterId || !/^[a-zA-Z0-9-]{8,64}$/.test(voterId)) return json(400, { error: 'bad_voter' }, origin);

  const voterKey = { PK: pk(slug), SK: `VOTER#${voterId}` };

  if (dir === 'up') {
    // Only count if this voter row does not already exist (idempotent up-vote).
    try {
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: { ...voterKey, v: 1 },
        ConditionExpression: 'attribute_not_exists(SK)',
      }));
    } catch (e) {
      if (e.name === 'ConditionalCheckFailedException') {
        const cur = await currentCount(slug);
        return json(200, { upvotes: cur, voted: true }, origin);
      }
      throw e;
    }
    const upd = await bumpCount(slug, 1);
    return json(200, { upvotes: upd, voted: true }, origin);
  } else {
    // Down: remove the voter row if present, then decrement once.
    try {
      await ddb.send(new DeleteCommand({
        TableName: TABLE,
        Key: voterKey,
        ConditionExpression: 'attribute_exists(SK)',
      }));
    } catch (e) {
      if (e.name === 'ConditionalCheckFailedException') {
        const cur = await currentCount(slug);
        return json(200, { upvotes: cur, voted: false }, origin);
      }
      throw e;
    }
    const upd = await bumpCount(slug, -1);
    return json(200, { upvotes: upd, voted: false }, origin);
  }
}

async function bumpCount(slug, delta) {
  const res = await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: pk(slug), SK: 'META' },
    UpdateExpression: 'SET upvotes = if_not_exists(upvotes, :z) + :d',
    ExpressionAttributeValues: { ':z': 0, ':d': delta },
    ReturnValues: 'UPDATED_NEW',
  }));
  return Math.max(0, res.Attributes?.upvotes ?? 0);
}

async function currentCount(slug) {
  const meta = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: pk(slug), SK: 'META' } }));
  return meta.Item?.upvotes ?? 0;
}

async function postComment(slug, body, event, origin) {
  // Honeypot: real users never fill this hidden field.
  if (clean(body.hp, 100)) return json(200, { ok: true, dropped: true }, origin);

  const name = clean(body.name, MAX_NAME);
  const text = clean(body.body, MAX_BODY);
  if (!name || !text) return json(400, { error: 'empty' }, origin);
  if (text.length < 2) return json(400, { error: 'too_short' }, origin);

  // Best-effort per-IP cooldown. Uses a short-lived marker row with a TTL.
  const ip = event?.requestContext?.http?.sourceIp || 'noip';
  const cdKey = { PK: `RL#${ip}`, SK: 'COMMENT' };
  const nowMs = Date.now();
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: { ...cdKey, ts: nowMs, ttl: Math.floor(nowMs / 1000) + 60 },
      ConditionExpression: 'attribute_not_exists(SK) OR ts < :cut',
      ExpressionAttributeValues: { ':cut': nowMs - COMMENT_COOLDOWN_MS },
    }));
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return json(429, { error: 'slow_down' }, origin);
    throw e;
  }

  const createdAt = new Date(nowMs).toISOString();
  const rand = Math.random().toString(36).slice(2, 8);
  const item = {
    PK: pk(slug),
    SK: `COMMENT#${createdAt}#${rand}`,
    name,
    body: text,
    createdAt,
    visible: true,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return json(201, { comment: { name, body: text, createdAt } }, origin);
}
