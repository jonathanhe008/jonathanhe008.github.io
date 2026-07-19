# Blog engagement API

Anonymous upvotes + comments for the blog posts on hejonathan.com.

- **1 Lambda** (`src/index.mjs`, Node 20, arm64) behind a **Function URL** — no API Gateway.
- **1 DynamoDB table** (on-demand billing, single-table layout).
- AWS SDK v3 is bundled in the Lambda runtime, so there are **no npm dependencies** to install or package.

At personal-blog traffic this sits in the AWS always-free / near-zero tier.

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET`  | `/posts/{slug}` | — | `{ upvotes, comments: [{name, body, createdAt}] }` |
| `POST` | `/posts/{slug}/upvote` | `{ voterId, action: "up"\|"down" }` | `{ upvotes, voted }` |
| `POST` | `/posts/{slug}/comments` | `{ name, body, hp }` | `{ comment }` |

- `voterId` is a random id the browser stores in `localStorage` — dedups upvotes per browser (spoofable by design).
- `hp` is a honeypot field; any value means "silently drop as spam".
- Comments are stored `visible: true`. **Moderation = delete or flip `visible` in the DynamoDB console.**
- Per-IP 30s cooldown on comments; length caps (name 60, body 2000).

## Deploy (AWS SAM)

Prereqs: AWS CLI configured with credentials that can create Lambda/DynamoDB/IAM, and [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

```bash
cd backend
sam build
sam deploy --guided        # first time: pick region (us-east-1), stack name, accept IAM changes
# subsequent deploys:
sam deploy
```

On success SAM prints `ApiUrl` (the Function URL). Copy it into `_config.yml`:

```yaml
engagement_api: https://<id>.lambda-url.us-east-1.on.aws
```

Then commit + push the site. The blog JS reads `site.engagement_api`; until it's set, upvotes/comments fall back to the local-only prototype and nothing breaks.

## Moderate / operate

- **Delete a comment:** DynamoDB console → table `hejonathan-blog-engagement` → find item with `SK` starting `COMMENT#` → delete. Or set `visible` to `false` to hide without deleting.
- **Reset an upvote count:** edit the `META` item's `upvotes` for that post's `PK` (`POST#<slug>`).
- **Logs:** CloudWatch Logs group `/aws/lambda/hejonathan-blog-engagement`.

## Local smoke test

```bash
cd backend
sam local start-lambda        # or `sam local invoke` with an event JSON
```
