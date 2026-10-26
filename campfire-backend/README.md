# Campfire Backend 001 · We Own the Backend

**No more searching for a backend.** This is a self-contained, first-party Node.js HTTP service with a durable SQLite database. It ships in NanaSpork itself, and uses **zero third-party runtime dependencies**—only Node 22 built-in `node:sqlite`, `node:http`, `node:crypto`, and the filesystem.

**Status:** source and offline HTTP integration tests. A public production URL, durable always-on hosting, and real independent human field receipts require the user's machine or an explicitly configured persistent host. Do not confuse a GitHub PR or the Garden's separate public Pocket UI with this service already running.

## What is real

- **Persistent private Campfire circles:** server-controlled random IDs, one-use expiring invitations, separate 256-bit member capabilities, and hashed storage of all invitation/member tokens.
- **No email/password required.** A capability is not verified identity; every human must receive their own one-time invitation and keep their own credential private. An organizer holding a person's credential could impersonate that member—avoid ever requesting credentials or posting them in chat or files.
- **Messages survive restart** in an SQLite WAL file. The sender is always derived from the token lookup, not from a browser-supplied `sender` ID. Other circles' members cannot read or post in the circle.
- **Need → helper reports → owner accepts some units.** Only the need-opening owner's distinct credential can confirm a helper's report; accepting an amount never overconfirms that report or the original open need. Helper reporting doesn't reduce the residual. A repeated `requestId` cannot double-count reports or confirmations.
- **Append-only, SHA-256-linked local audit stream**, and an operator-only integrity check. This is a *local tampering signal*, not an independent witness, recipient authentication, external timestamp, or blockchain.
- **Revocable individual credentials**, in-memory per-IP request rate limiting, small request bodies, no unauthenticated data API, strict browser Origin check, and no service-provider credentials.
- **Mobile web interface:** join by code, restore private member token, send ordinary messages, view a circle's needs, report help, accept a reported amount. The browser uses **sessionStorage only**—token disappears when the browser session ends. A person must save their own token privately to return (or get a fresh invitation).

## Start it on your computer

Requires Node **22.13+**. Node 22 currently labels its built-in SQLite API experimental: run the integration tests before relying on this system for anything sensitive.

From the NanaSpork repository checkout:

```sh
# Generate and privately retain this for future restarts. Don't paste it into GitHub or a chat.
openssl rand -hex 32

export CAMPFIRE_BOOTSTRAP_KEY='<paste-your-own-64-character-hex-key-here>'
export CAMPFIRE_DB_PATH='./private-data/campfire.sqlite'
node campfire-backend/server.mjs
```

Open **http://127.0.0.1:3417/** on that same computer. The backend defaults to **loopback only** and refuses public network binding unless explicitly permitted.

The database file is created on first start. Messages, member credentials (hashed), reported quantities, and owner confirmations survive a restart. **Private messages are stored at rest in readable SQLite text**; the disk/volume must be secured and encrypted. The service is not yet appropriate for private domestic-abuse histories or children's records.

### Administrator: generate invitations without a vendor

In a second terminal, with `CAMPFIRE_BOOTSTRAP_KEY` still set:

```sh
node campfire-backend/manage.mjs circle "First Campfire Trial"
# Save the returned circle ID privately.

node campfire-backend/manage.mjs invite '<circle-id>' owner
node campfire-backend/manage.mjs invite '<circle-id>' member
node campfire-backend/manage.mjs invite '<circle-id>' member

node campfire-backend/manage.mjs audit
node campfire-backend/manage.mjs revoke '<actor-id>'
```

The first `owner` can open the small need. A member can report help. A different `member` can test the hostile nonmember denial in **a separate circle**, not in the same one. The admin is not a member unless they redeem their own one-time invitation.

**One person / one credential** for the field test. A web form with a dropdown of fake user roles is not independent account proof. The three-account trial uses three browsers/devices where possible.

## Deployment without another backend provider

Option A: Use Node directly on an existing computer that stays on, with the SQLite file on a persistent, encrypted disk.

Option B: Included `Dockerfile` and `docker-compose.yml`; its SQLite volume survives container restarts. Default host binding is **127.0.0.1**, not the public internet.

For remote friends, put a **trusted HTTPS reverse proxy with access controls and secure transport** in front of the service. Don't expose port 3417 directly on the public Internet. An ephemeral/serverless Vercel filesystem is **not durable storage** for this SQLite database. Modal can run a container only if an appropriate persistent volume and HTTPS ingress are configured; a spend limit does not supply those automatically.

This is real backend software, but **deployment to the user's local hardware has not happened automatically**. Neither GitHub nor the connected Supabase project grants access to the user's computer.

## Tests

```sh
node --test campfire-backend/server.test.mjs
npm test
npm run lint
npm run build
```

The first test runs a real HTTP server with temporary SQLite files. It verifies:
- invite code can only be redeemed once; 3 independent anonymous *credentials*;
- a person in circle B cannot read/post in circle A, even with a valid token;
- a forged `sender_user_id` is ignored and the true sender comes from authenticated capability;
- messages/needs/reports persist across process restart;
- reporting does **not** change residual; only distinct owner capability confirmation changes it;
- repeated report/confirmation request IDs are idempotent, overconfirmation rejected;
- revoked credentials stop working; private audit integrity check succeeds;
- anonymous and cross-origin reads/writes refused.

These are **programmatic token isolation tests**, not evidence of three real humans, true human identity, physical delivery, robust disaster recovery, or security penetration testing. See [FIELD-SPECIMEN-002](../docs/field-specimen-002.md) for the separate live trial.

## API quick reference

| Method | Path | Auth | Outcome |
| --- | --- | --- | --- |
| GET | `/health` | None | no private records |
| POST | `/v1/admin/circles` | 32+-character admin key | creates private circle |
| POST | `/v1/admin/circles/:id/invites` | Admin | returns one-use owner/member invitation, expires in 24h |
| POST | `/v1/join` | One-use invite body | returns private member bearer capability |
| GET | `/v1/me` | Member token | returns scoped actor + role |
| GET/POST | `/v1/circles/:id/messages` | Circle member | read/post only in own circle |
| GET/POST | `/v1/circles/:id/needs` | Circle member/owner to create | needs and current residual |
| POST | `/v1/needs/:id/reports` | Another circle member | reports quantity, does not confirm |
| POST | `/v1/reports/:id/confirm` | Need-opening owner only | accepts part of report without exceeding open need |
| POST | `/v1/admin/actors/:id/revoke` | Admin | revokes private capability |
| GET | `/v1/admin/audit` | Admin | verifies local hash chain |

**Boundary:** `memberCredential != human identity`, `ownerCapabilityConfirm != physical recipient evidence`, `SQLite checksum != external witness`, `backend != another Supabase project`. Public LemonPRESS/Free Graph/GRAFT receives nothing from this backend automatically. Nothing here creates a public profile, notification, next table, debt, or aid entitlement.

## Known v1 omissions before sensitive/public production

No identity-proofing, password/device-loss recovery, two-factor authentication, automated encrypted backups/restore drills, client-side encryption, per-recipient privacy controls, attachment scanning, anti-abuse reporting, audited server-side user deletion/retention, independent cross-device physical custody proof, or push/realtime messaging. The present UI requires manual refresh. SQLite WAL is suitable for a **single writable server with persistent disk**, not multiple stateless Vercel functions sharing a nonexistent filesystem. Keep it invite-only and use synthetic data until consent/security testing is complete.

## First real three-person test with no Supabase project

Use [FIELD-001.md](FIELD-001.md) for the self-owned Campfire workflow: Circle A owner and member, Circle B nonmember, built-in **Boundary Check** on the phone (must return HTTP 403), persistent message restart, a small report then partial owner acceptance. This supersedes the *need to find a hosted Supabase project* for this route. The alternate legacy Supabase field-proof document remains valid only if that source infrastructure is deliberately chosen. A verified human/physical-world recipient remains a separate gate.
