# NOW-ROUTE-002 — authenticated Campfire discovery (STAGED)

## What changed and what did NOT

This is a source-native **BananaSpork / Garden** candidate for a real-time, member-scoped, opt-in physical generosity exchange. It follows the JAR;VIS NOW-ROUTE-001 local proof without creating a competing Jubilee ledger.

Now there is a feature-gated Garden panel that lets a signed-in Campfire member:
- Explicitly post *I have extra* or *I could use* (no accounts created by JAR;VIS).
- Select an **approximate area center** from limited Waseca-region options, not GPS or a pickup address.
- Choose an expiry window. Refuse to share a cold-chain item without the offeror's explicit self-attestation (not a safety inspection).
- Allow another member of **the same Campfire** to discover a time/radius/pickup-compatible proposal.
- Withdraw an unaccepted ephemeral post through owner-bound database RLS.
- See refreshed opportunities when PostgreSQL Realtime changes arrive or the screen polls.

**It does NOT** send an invitation, reserve stock, confirm a second human's handoff consent, share pickup details, send push notifications, verify safe food temperature, perform any Jubilee mutations, or claim a completed donation. Suggestions are **SUGGESTED_ONLY**. Auto-match is not auto-contact. All matching is restricted to active posts returned by existing Campfire RLS.

## Current implementation and authority

- Pure domain matcher: src/domain/now-route/matching.ts
- Authenticated, intentionally isolated database transport: src/domain/now-route/supabaseTransport.ts
- Feature-flagged Garden UI: src/domain/now-route/NowRoutePanel.tsx
- Proposed SQL (NOT an applied migration): docs/proposals/now-route-002-schema-proposal.sql
- Pure domain / structural checks: src/domain/now-route/nowRoute.test.ts
- Three **real** account test runner for a deliberately chosen nonproduction project: scripts/now-route-fieldcheck.mjs

The SQL deliberately lives **outside** supabase/migrations. Do not move or execute it until the *actual BananaSpork Supabase project*, schema, permissions, and test accounts are identified. The user's connected Supabase list currently includes pantry-gate, WITNESS and an inactive unrelated project; no project was verified as the BananaSpork authority. **Do not apply this schema to pantry-gate** or publish this feature using its service credentials.

The feature is **off by default**, and only visible when VITE_NOW_ROUTE_STAGING=1, Supabase is configured, and useCampfireSession has a real authenticated current member and active circle. If the reviewed schema is absent, operations hold with an error; no fake production success.

## Source boundaries

- The new tables contain temporary **participation announcements**, not witness events, offer acceptance, fulfillment or Jubilee receipts. They do not replace public.witness_events, its hash-chain or existing authority RPCs.
- The database derives owner_user_id from auth.uid(). Client roles have INSERT only on explicitly allowed columns, SELECT and owner-restricted DELETE. There is no client UPDATE, ALL, or service-role fallback.
- SELECT and INSERT require bananagram_core.is_member_of_circle(circle_id), reusing the existing nonrecursive membership helper.
- No public/anon access. Within one circle, opted-in, unexpired data is visible to *all* other circle members. Circle membership is not equivalent to a confidential one-to-one exchange.
- Location values are **coarse 0.01 degree area centers**. In a rural region, even coarse area centers may be revealing; no precise GPS coordinates should be supplied, inferred or stored. Review group safety and user expectations before production.
- Description validation rejects some contact details, but is not a guarantee against intentional sensitive disclosures; moderation and removal controls remain necessary.
- Cold-chain self-attestation is a precondition for showing food requiring refrigeration, **not a verification** of storage temperature. Expiry windows are coordination deadlines, not food safety limits.
- The single-circle discovery surface does **not** find every needy person within five miles. Cross-Campfire discovery requires separate scoped opt-in and privacy reviewed architecture.
- Expired rows are hidden from other members by RLS but remain in the database until explicit cleanup/retention is implemented. This is a **deployment blocker**; do not enable general public use without retention and content removal policy.
- Realtime merely refreshes an in-app list; **notifications when offline, background push, SMS and email are not implemented**. A subscription is not proof of successful delivery to a device.

## How to prove the two-account boundary

After the owner creates or selects a **nonproduction BananaSpork project**, confirms the existing core migrations, source reviews the proposed schema, and deliberately applies it there:

1. Create or identify one test Campfire. Two distinct real auth users A and B must both be members of it; account C must not belong to it. Use only synthetic nonperishable fixture text (not real fish).
2. Run the pure checks first: npm run lint && npm run test:now-route && npm run build.
3. In a local nonpublic build only, set VITE_NOW_ROUTE_STAGING=1 and the public Supabase URL and publishable key. No service-role token ever reaches the client.
4. Sign in as A and B on separate devices or browser profiles. A posts the synthetic extra goods; B posts the synthetic need. Observe a compatible **proposal** in both views. Use withdrawn posts to test revocation, and restart a browser to verify data rehydrates. Confirm C cannot see A/B, even by direct API access.
5. Run the optional API fieldcheck with environment variables (never commit values): NOW_ROUTE_TEST_URL, NOW_ROUTE_TEST_PUBLISHABLE_KEY, NOW_ROUTE_TEST_CIRCLE_ID, NOW_ROUTE_A_EMAIL/PASSWORD, NOW_ROUTE_B_EMAIL/PASSWORD, NOW_ROUTE_C_EMAIL/PASSWORD, and NOW_ROUTE_FIELD_TEST_CONFIRM=I_ACKNOWLEDGE_FIELD_WRITES. The script writes clearly labeled synthetic rows and attempts deletion in finally.
6. Inspect Supabase security advisors, Postgres privileges and actual public Data API exposure. Verify attempts to forge another owner, impersonate C, mutate statuses, withdraw someone else's row, and cross membership boundaries **fail**.
7. Preserve a reviewable report with the selected project reference (no secrets), user-role labels, migration identifier, read/write observations, negative-case outcomes, restart/realtime behavior, retention gaps and unresolved safety issues.

No result is field-proven until the actual database tests and separate phone test succeed. Pure JS tests and a migration proposal cannot certify RLS.

## Next downstream boundaries

**NOW-ROUTE-003 / invitation & receipt:** Introduce a source-owned recipient-specific proposal and independent acceptance, donor report, and recipient confirmation using authenticated, append-only transitions. Avoid user-ID spoofing and double reservation. Where a need enters Jubilee, issue commands through the *existing* Jubilee RPCs only; maintain source IDs and status correspondence. An exchange cannot be counted as delivered merely because a draft was sent.

**NOW-ROUTE-004 / consented notifications:** Device-specific opt-in, masked push text, rate limits, anti-harassment, quiet hours, withdrawal and expired notifications, and isolated subscriptions. Offline/mobile reachability must be proven separately.

**NOW-ROUTE-005 / first physical field receipt:** With actual willing people, an ordinary nonperishable resource should move within a defined window. Record independent human attestations and outcome uncertainty; no account relationship, media post or recruitment required.

## Success condition

**One real useful object reaches a consenting person without publishing sensitive details or making anyone owe a favor.** A new social connection is a possible by-product, not a mandatory output.
