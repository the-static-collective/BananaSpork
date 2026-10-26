# CAMPFIRE FIELD-001 — Three humans, our own backend

**Status:** instrument ready for a controlled voluntary test; no users, physical deliveries or externally verified witnesses were created by publishing this document.

## We stopped looking for a backend

NanaSpork now includes `campfire-backend/`, a standalone Node+SQLite server with an ordinary phone-friendly browser surface. **No Supabase project or third-party backend has to be found or selected** for this particular proof. The earlier `docs/field-specimen-002.md` explores the original Supabase/RLS path, which remains independent; this procedure uses **our own API's per-circle capability authorization**, not Postgres RLS.

A backend is not the same as a hosted server. An always-on computer with a persistent, protected disk runs it; a trusted HTTPS gateway makes it remotely reachable.

## Start

1. Follow [campfire-backend/README.md](README.md) on the computer that will act as the server. Generate and protect an administrator key and choose a private SQLite file path. Start `node campfire-backend/server.mjs`.
2. The host creates **Circle A**, then three separate one-time invites as needed: one `owner` and one `member` in A; create **Circle B** and invite the third `member` there.
3. Each person accepts **their own** invitation using the Campfire browser UI from a separate browser or device, privately retaining only their own access token. No shared credentials.
4. The owner and A's member each send one ordinary harmless test message. Refresh; both see the sender derived from the actual token and the two persisted messages.
5. The third person, logged into Circle B, enters **Circle A's ID, not its private access token**, in the built-in *Boundary Check*. It must return **403 ACCESS DENIED**. A 200 from someone who does not belong to A stops the experiment.
6. Restart the backend; A and B reopen their own valid tokens and check that shared messages and circle membership survive.
7. Owner A opens a small, explicitly experimental need (e.g., **12 sample cartons**) in Basket; helper reports **9**. Refresh. The need must still show **0 accepted, 12 remaining**.
8. Owner A sees that helper's report in their private report inbox and chooses to accept **6**. The need should then display **6 accepted, 6 remaining**, regardless of the helper's higher report. The helper may not accept their own report on the owner's behalf.
9. Owner can refuse/stop there, or test idempotency and revocation using the admin tool. No second physical report is counted automatically.
10. If **real** aid is involved later, the person who actually receives it must give their own account and permission, separately from the app's credential-based acceptance. **A browser button alone is not verified physical delivery.**

## What counts as a demonstrated technical result

- **Three separate real sessions:** owner/member in A and nonmember in B.
- **Read/write isolation:** cross-circle token fails GET and POST; ordinary HTML UI reads only token's own circle.
- **Durability:** messages, needs, reports and acceptances survive server restart.
- **No false aid claim:** report before owner acceptance does not reduce residual.
- **Conservative accounting:** accepted quantity cannot exceed either the open requirement or what was reported; duplicate request IDs cannot double count.
- **No automatic recruiting:** system sends no invitations or follow-up and never indexes people publicly.

The standalone HTTP integration test in `campfire-backend/server.test.mjs` already exercises those software invariants with independent tokens and a real SQLite restart. The **human field test above is separate and still to be performed**.

## Data boundaries

No child names, custody documents, domestic-abuse accounts, real sensitive grocery aid case, home addresses, medical data, or passwords should be entered. This v1 stores chat text readable on the server's disk and does not include audited data retention, end-to-end encryption, independent identity assurance or secure production user recovery.

Only independently reviewed, public-safe learning from the experience may be transferred to GRAFT or Free Graph. The raw SQLite database and bearer credentials stay private.

## If a security boundary fails

Stop. Preserve a minimal error code and the test's non-identifying steps. Revoke the affected credential with the admin CLI. Do not upload live access tokens or the private database. Fix the actual server behavior before presenting anything as a trustworthy Campfire field result.

**Law:** MEMBER CAPABILITY ≠ HUMAN IDENTITY. REPORT ≠ DELIVERY. OWNER ACCEPTANCE ≠ INDEPENDENT PHYSICAL WITNESS. A PERSISTENT SQLITE FILE ≠ A PUBLIC SUCCESS STORY.
