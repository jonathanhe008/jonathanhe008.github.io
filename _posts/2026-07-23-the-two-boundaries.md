---
layout: post
title: "The Two Boundaries: Governing Agents Without Reinventing Access Control"
date: 2026-07-23
description: "The industry defines least agency as least privilege plus conditions. That framing bleeds non-determinism across your whole system. Two independent boundaries make the problem tractable."
---

The industry has mostly settled on a definition of least agency, and it goes something like this: least agency is least privilege plus conditions on when the privilege may be used. The usual analogy is a driver's license. The license is your standing permission — static, always valid. Least agency is the rule that you may not drive while drunk. So agency becomes permission, plus the conditions under which that permission is allowed to be exercised.

It is a clean analogy. It is also, I think, the wrong model — and adopting it leads to a lot of avoidable pain.

Getting this right matters, because this is where most of the risk lives. Read down the [OWASP Top 10 for Agentic Applications](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) — goal hijacking, tool misuse, memory and context poisoning, cascading failures, rogue agents — and nearly all of it describes an agent that was *authorized* for every step and still did the wrong thing. Only one entry, identity and privilege abuse, is a classical access-control failure. The rest are failures of the decision, not the access — precisely the class of problem a permission model was never built to catch.

## Why "permission plus conditions" bleeds

The problem with folding conditions into the permission is that it couples two very different things. The condition only exists as a modifier on access you have already assumed. To evaluate "may this act proceed," you now have to evaluate the permission *and* a behavioral judgment about whether this particular action, right now, is appropriate — in the same place, at the same time.

That behavioral judgment is the hard part, because for an agent it is non-deterministic — not because it is random, but because the action is chosen fresh at runtime from untrusted input, rather than fixed and reviewed ahead of time. A traditional program's next action was fixed at build time; an engineer decided it, reviewed it, and shipped it. An agent decides its next action at runtime, using a model that can be steered, injected, or simply wrong. When you make that judgment a condition *inside* your access check, you push non-determinism into your access-control layer.

And access control is not one place. In a distributed system it is everywhere — every service in the call graph makes an access decision. So "permission plus conditions" means every one of those services now has to reason about agent behavior, intent, and context. Non-determinism bleeds across the entire graph, and each team ends up reinventing the same behavioral logic locally. That does not scale, and it makes the system impossible to reason about as a whole.

## Two questions, not one

The way out is to notice that "may this act proceed" is really two independent questions:

- **Can this actor access this resource?** This is classical access control — least privilege. It is what your system already does today.
- **Should this action be attempted at all, given the task and context?** This is the new question. It is about *behavior*, not permission.

These are not the same question with a modifier. They are independent, and either can fail without the other:

- **Appropriate but unauthorized** — the agent correctly decided what the user wanted, but the actor lacks permission.
- **Authorized but inappropriate** — the actor has every permission, but a prompt injection made it act against the user's intent.

Back to the analogy: stopping a drunk friend from driving does not require you to first check whether they have a license. You intervene on the *appropriateness* of the act, independent of the permission. The two judgments do not nest inside each other; they are independent.

## The decision boundary and the access boundary

Naming the two questions gives you two boundaries.

The **access boundary** sits between an attempted action and the protected resource. It answers *can this actor access this resource*, enforced through the mechanisms you already have — identity, delegation, scopes, fine-grained policy. This is least privilege, and it is not new.

The **decision boundary** sits upstream, between the agent's reasoning and any action with real consequences. It answers *should this be attempted*. It treats every action the agent proposes as untrusted input — the same way you treat any input you did not generate yourself — and can allow, deny, narrow, hold, escalate, or require human confirmation. This is the new control, and it is what I would call **governed autonomy** rather than least agency. (More on the name below.)

Both must hold. They compose; they don't nest.

## Why independence is the whole point

Separating the boundaries is not a stylistic choice — it is what makes the problem tractable.

Contain the non-determinism at one boundary. The agent's reasoning is the single non-deterministic step in a request. Isolate it behind the decision boundary, and have that boundary emit a simple, deterministic attestation of *how* the action was decided — for example, whether a human confirmed it, an independent evaluator approved it, or the agent decided on its own. That attestation travels with the request as an ordinary attribute.

The mechanisms that produce it are a growing toolkit, not one technique: **steering** (system prompts and policies that shape how the agent reasons), **intent supervision and risk evaluators** (an independent judge that scores whether an action fits the task before it runs), **temporal policies** (guarding against unsafe *sequences* — a combination of individually fine steps that becomes dangerous together), and **human confirmation** for the highest-consequence actions. They range from soft to hard: steering shapes the decision but can be overridden; the harder controls enforce it. What they share is that they all run at the decision boundary and resolve into the same kind of attestation.

Now everything downstream is deterministic again. The access boundary does not reason about the agent's intent; it evaluates attributes against policy, exactly as it does today — and one of those attributes happens to be how the decision was made. A high-consequence operation can require a stronger attestation before it proceeds. But the access layer never has to think about non-determinism, because it was resolved and stamped upstream.

This is the difference between a system you can reason about and one you cannot. "Permission plus conditions" spreads behavioral judgment across every service. Two independent boundaries confine it to one, and keep the rest of the graph deterministic and composable.

## The contract between them

Independent does not mean disconnected. The boundaries are joined by a contract, and the attestation is that contract. It flows in both directions, asymmetrically — which is exactly what keeps the boundaries from collapsing back into one.

Forward, the decision boundary hands the access boundary a signed attestation of how the action was decided — bound to the specific action and resistant to forgery, so the access layer can trust that "a human confirmed this" reflects a real, out-of-band confirmation and not something the agent fabricated. Reverse, the access boundary can push back: it is often the only party that knows a given operation *requires* confirmation, so when a request arrives without the needed attestation, it does not grant access — it returns a challenge. That challenge carries no authority of its own; it only states an unmet requirement, prompting the decision boundary to obtain the confirmation and try again.

Only the decision boundary can mint an attestation; only the access boundary can grant access. Neither ever produces the other's artifact. If that shape feels familiar, it should — it is the same one as step-up authentication, where a resource returns a challenge and the client re-authenticates before retrying.

## A note on the name

"Least agency" is an unfortunate term. It implies the goal is to minimize an agent's autonomy — but autonomy is exactly what makes these systems valuable. We do not want less of it. We want *more* of it, safely: autonomy that is visible, attestable, and governable at the decision boundary.

That is why I prefer **governed autonomy**. And more than a naming preference, it points at the real design principle: an agent should not have to be caged to be safe. It should be free to act, within bounds that make its actions safe to grant — and those bounds live at a boundary of their own, not as fine print on a permission.

Least privilege for access. Governed autonomy for behavior. Keep them independent, and the hard problem gets a lot smaller.
