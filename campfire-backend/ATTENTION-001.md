# ATTENTION-001 · The Firebox can explain what comes next

**Goal:** A community organizer should be able to ask one question—**Given what is actually present, what useful thing could we prepare within the next 24 hours?**—and receive an answer that names its basis, permission boundary and evidence standard.

## Try it on your own computer

From the BananaSpork project directory:

    node campfire-backend/start.mjs

In a second terminal:

    node campfire-backend/manage.mjs status
    node campfire-backend/manage.mjs next

Use http://127.0.0.1:3417/how for the human tour, including explanations of the Attention Desk. Both CLI commands automatically use the private operator key created on first launch. No new provider, API token, database setup or cloud account.

## What is being asked

Source: `GET /v1/admin/attention`, admin-only. A pure, deterministic evaluator in `attention.mjs` converts **aggregate SQLite counts** and local audit state into at most one prioritized next-24-hour card plus a short set of other possibilities. The evaluator does **not** read chat bodies, need descriptions, member names, beneficiary details, email, location, access keys or member stories. It cannot ask a model to make judgments about a person.

Every card carries:

- **Observation:** what the database actually establishes.
- **Prepare:** one harmless next artifact or question, not a completed action.
- **Permission:** who must choose before acting.
- **Evidence:** what an operator could independently check.
- **Standing:** `PROPOSAL_NOT_ACTION`, `canExecute:false`, `hasConsent:false`.

A local audit hash failure returns **HALT_INTEGRITY** with no competing automated actions. Other opportunities depend on what exists: make a first circle, recruit a willing owner for a keeperless room, issue one separately consented member invitation, test harmless messages, offer a fictional small need, invite an owner to review an unconfirmed report, or identify the independent witness missing behind credential-based owner acceptances.

Because this first version has no independently verified backup/restore program, it will also suggest protecting the logbook. **That is a truthful reminder, not a claim that a backup has been made.**

## The contract for JARVIS / GRAFT / Free Graph

The response is `campfire.operator-attention/v0`. It is PRIVATE operator state, not a public website feed. JARVIS may eventually *read a separately authorized, attenuated version* through a trusted adapter, but it may not automatically turn a suggestion into enrollment, messaging, fulfillment confirmation, verified fruit or public knowledge.

The public `/.well-known/campfire-waggle.json` remains a separate capability-only discovery card. It exposes **none of the Attention Desk records or counts**. Do not export `/v1/admin/attention` into that waggle endpoint.

## What the Attention Desk does *not* know

It does not know whether the grocery or food shelf actually needs anything, whether a named person agreed to help, whether a member capability represents a separate actual human, whether a report corresponds to physical delivery, or whether the logbook can be restored from backup. Its possible next actions may be irrelevant until a real person supplies and authorizes additional context. The user can reject every suggestion.

**Next field gate:** a local operator runs `next` against their real private (non-sensitive test) data and finds one recommendation useful enough to prepare. A real person may then consent to test it. Confirming any physical outcome remains the responsibility of the source owner and actual recipient. This PR includes tests of the source protocol, not field adoption.

## Release evidence

`attention.test.mjs` exercises source-based recommendations, no automatic action, audit-failure halt, no invented owner/witness confirmation and defensive input checks. `server.test.mjs` verifies that the endpoint requires the administrator key and tracks *actual* synthetic SQLite activity without leaking message content. `start.test.mjs` verifies the operator CLI uses the private key file and doesn't print it.

**No public backend has been deployed by this change.** This is source code for the same locally runnable single-host Firebox and will become live only on its actual host when that code is updated.
