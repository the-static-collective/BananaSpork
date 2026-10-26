# WAGGLE 001 · A backend a human can understand

**The core idea:** The Firebox should be able to say: I'm awake. I can remember things. I check who is allowed in. I cannot certify that physical help occurred.

After starting the backend, open http://127.0.0.1:3417/how for the 2-minute interactive explanation.

## Four pieces

| Name | What it really is |
| --- | --- |
| Firebox | Node.js HTTP process that enforces authorization and the application rules |
| Logbook | SQLite WAL file on one host that preserves messages and claims across a restart |
| Keys | One-time invitations and member-specific, privately retained bearer capabilities |
| Door | The mobile browser UI, which is not the authoritative record |

On the host computer, run: node campfire-backend/manage.mjs status

That command uses the private local admin key and reports the number of circles, active keys, messages, needs, reports and owner acceptances; local audit hash-chain result; and the explicitly UNVERIFIED backup / human identity / delivery states.

The public /how page only queries /health. It gets no admin key, member list or private circle data.

## What the waggle actually does

GET /.well-known/campfire-waggle.json advertises a minimal public-safe capability card. It has no circles, names, chat content, member IDs or invite tokens. A future approved JARVIS or GRAFT discovery adapter could use it to learn which protocol a node speaks. It does not broadcast participant data, send invites, publish receipts or move the SQLite logbook.

Proposed loop: node advertises public-safe capabilities; agent sees a possible task; human explicitly authorizes; one owner-controlled Firebox makes the authoritative record; independently reviewed public-safe learning may return; agent leaves.

**Code can move. Private keys must remain controlled. One authoritative logbook needs one honest home.**

## Modal: compute can bounce, but the database must not bounce casually

Modal supports web servers via its web_server port decorator, including non-Python servers. So it can host the Node Firebox process in principle. But its Volumes require explicit commit/reload for persistence visibility and have last-write-wins hazards for conflicting writes. SQLite WAL relies on coordinated local disk semantics; concurrent ephemeral Modal containers sharing a SQLite database is not a safe default.

Three deployment patterns:

1. **Preferred first:** a stable owner-controlled Firebox with SQLite; Modal runs stateless bees for public-safe calculations or research. Bees can roam while the logbook stays put.
2. **Later option:** Modal web compute plus a separately designed transactional database. This may bring back a provider and requires a specific service decision.
3. **Experimental only:** one-container writable Modal Volume with verified exclusive ownership, orderly commit and restore drills using synthetic data. Not accepted for sensitive household/survivor production.

**No Modal deployment is performed in this PR.** No Modal tokens, secrets, vulnerable household data or fake delivery records were transferred.

Vendor documentation (checked October 2026):
- https://modal.com/docs/sdk/py/latest/web_server
- https://modal.com/docs/sdk/py/latest/Volume
- https://www.sqlite.org/useovernet.html

## Hard boundary

Server responsiveness does not establish a disk backup. A member credential does not establish human identity. An owner clicking accept does not establish physical delivery. These are separate gates.
