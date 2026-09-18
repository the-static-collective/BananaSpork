# HELP-SLIP-GARDEN-ADAPTER-001 — Device Hold Before Campfire Pour

Status: approved architecture / written-spec review gate
Date: 2026-09-18
Owner-local repository: NanaSpork / BananaSpork
Upstream semantic kernel: Band Runtime HELP-SLIP-HOLDING-BASKET-001
Foreign producer specimen: Nourish-Kids fulfillment-envelope/v0

## 1. Purpose

Connect the existing NanaSpork/Garden community desk to the new Help Slip / Holding Basket semantics without turning receipt into publication.

The first adapter proves:

> A Nourish Help Slip can arrive on one device, remain local and inspectable, preserve Band Runtime-compatible identity/residual semantics, and only become shared Campfire history after an explicit human POUR.

Flow:

    NOURISH
      -> immutable Help Slip
      -> GARDEN INBOX
      -> DEVICE-LOCAL HOLD
      -> explicit human review
      -> explicit POUR of selected requirement(s)
      -> JUBILEE / CAMPFIRE need.opened

Core law:

    IMPORTED HELP SLIP != SHARED CAMPFIRE NEED
    RECEIVE != HOLD != POUR

## 2. Existing jurisdictions

Nourish-Kids owns source-side pantry evaluation, missing versus unknown, residual construction, source disclosure choice, and the immutable fulfillment-envelope/v0 that crossed the boundary.

Band Runtime owns the canonical receiver semantics: strict admission, carrierHash, deterministic payloadHash, duplicate receive semantics, held-case identity, append-only lifecycle distinctions, residual arithmetic, and replay laws.

NanaSpork / Garden owns the human-facing device inbox, local preview and HOLD presentation, local persistence, active Campfire selection, explicit POUR interaction, mapping selected held requirements into supported Jubilee authority commands, and visible source-to-authority links after successful POUR.

Jubilee / Campfire owns the current shared authority lifecycle:

    need.opened
      -> offer.pledged
      -> offer.accepted / offer.declined
      -> fulfillment.reported
      -> fulfillment.confirmed
      -> need.closed

The adapter must not rewrite or bypass this lifecycle.

## 3. Local HOLD first

Receiving a Help Slip never calls Supabase.

The user may paste/import, preview the exact disclosure, admit it to device-local HOLD, inspect duplicate status and residual, discard/refuse locally, and later choose Pour into this Campfire.

Only that final explicit action may invoke the existing open-need authority path.

    PASTE != PUBLICATION
    IMPORT != REQUEST TO COMMUNITY
    HOLD != SHARED HISTORY

## 4. Device-local held slip

V0 introduces a dedicated NanaSpork domain seam under src/domain/help-slip/.

Conceptual state:

    GardenHeldHelpCase
      localCaseId
      sourceOccurrenceIds[]
      envelopeId
      carrierHash
      payloadHash
      immutable payload
      heldAt
      status = held
      requirementLinks[]

The imported payload is immutable. Local UI metadata may change around it; the payload does not.

## 5. Cross-repo compatibility

NanaSpork does not invent a second Help Slip protocol.

For fulfillment-envelope/v0 it must reproduce Band Runtime-compatible behavior:

- same accepted schema;
- same required disclosure flags;
- same field restrictions;
- same positive finite quantity rules;
- same quantity-requires-unit rule;
- same schema-order serialization;
- same SHA-256 payloadHash;
- same duplicate meaning: same validated payload may arrive multiple times without creating duplicate demand.

V0 includes at least one golden compatibility fixture carrying raw carrier, expected carrierHash, expected canonical payload, and expected payloadHash. NanaSpork tests must produce the same expected values as Band Runtime.

NanaSpork already has canonicalJson for Jubilee witness events. That function must not silently replace the Band Runtime Help Slip schema-order serializer unless a fixture proves byte-identical output. Help Slip identity and Jubilee event-chain identity remain separate hashing domains.

## 6. Local persistence

V0 may use the existing device-private persistence style already used by Donkey and local Campfire proposals.

Suggested storage key: bananagram_help_slip_holds_v1.

Rules:

- browser/Capacitor local storage only for v0;
- no Supabase write during RECEIVE or HOLD;
- malformed stored records fail closed;
- duplicate payloads retain arrival occurrences but reuse one held case by payloadHash;
- held-slip content stays out of Gemini, shared chat, Intelligence context, and Jubilee receipts by default;
- device-private HOLD is visibly labeled.

A future stronger local store may replace localStorage without changing the semantic contract.

## 7. Garden Inbox

Garden gains one entry point: Help Slip Inbox.

The first UI needs only Import Help Slip, held-slip cards, exact source label, requirements, quantity/unit, needed-by, duplicate-arrival indicator, Held on this device status, Review, and Pour into this Campfire.

No matching, prioritization, reputation, urgency scoring, or public discovery.

## 8. Import preview

Before HOLD, Garden shows the exact disclosure being imported: purpose, requirements, quantities/units, needed-by fields, source system, source recipe ID if present, and envelope ID.

The user may cancel without creating shared or local authoritative history.

Admission errors are explicit: invalid JSON, unsupported schema, malformed requirement, invalid quantity/unit, invalid disclosure flags, or unsupported source status.

## 9. Duplicate semantics

Same validated payload imported twice means:

    two arrival occurrences
    one held case
    one demand

Garden may show: Seen again — this is the same Help Slip already held on this device.

It must not silently create another Campfire need from the duplicate.

## 10. POUR is per requirement

A Nourish envelope may contain heterogeneous requirements. Current Jubilee need.opened accepts one target quantity and one unit label.

Therefore V0 must not flatten a multi-requirement envelope into one shared need.

Example:

    Help Slip
      2 cans tomatoes
      1 skillet

becomes, after explicit selection:

    need.opened A: Canned tomatoes / targetUnits 2 / unitLabel can
    need.opened B: Skillet / targetUnits 1 / unitLabel item

Only explicitly selected requirements become shared needs.

## 11. Requirement-to-Campfire lineage link

A successful POUR creates a local adapter link containing:

- localCaseId;
- requirementId;
- payloadHash;
- circleId;
- real authorityNeedId returned by Jubilee;
- pouredAt;
- optional witnessReceiptId.

This is a lineage link, not identity.

    SOURCE REQUIREMENT != JUBILEE NEED

## 12. POUR preview

Before any RPC call, Garden shows exactly what will be shared.

For each selected requirement it shows the active Campfire and the exact title, summary, requested item label, target units, and unit label.

By default it does not share the full source payload, other held requirements, recipe ID, envelope ID, payload hash, full purpose text, or unrelated private context.

The exact summary shown in the preview is the exact summary sent.

## 13. Quantity rules

For quantity-bearing requirements, preserve source numeric quantity and source unit label. No conversion and no silent rounding.

For qualitative requirements with no quantity, V0 projects targetUnits 1 and unitLabel item, with a visible notice that this is a one-item shared representation of a qualitative source requirement.

## 14. Source metadata disclosure

Recipe metadata, envelope ID, hashes, and source-system metadata remain locally retained by default and are omitted from the shared open-need payload.

Project the need, not the entire source context.

## 15. Campfire authorization gate

POUR requires the existing shared-authority prerequisites:

1. configured Supabase public client;
2. authenticated session;
3. active accessible Campfire membership.

If any are missing, the Help Slip stays held locally and no shared need is claimed.

## 16. RPC boundary

Shared publication routes through the existing Jubilee gateway and rpc_open_need path.

Do not write directly to witness_events, ledger_heads, projection tables, or locally fabricated shared IDs.

The successful authority response supplies the real authorityNeedId and witness receipt.

## 17. Existing lifecycle mapping

After POUR, Garden may display the linked Jubilee projection beside the source requirement:

    need.opened -> shared need exists
    offer.pledged -> support pledged
    offer.accepted -> commitment accepted
    fulfillment.reported -> delivery reported
    fulfillment.confirmed -> recipient/household confirmed

Critical law:

    fulfillment.reported != receipt confirmed

The held Help Slip is never rewritten by these shared events.

## 18. Residual display

For a linked quantitative requirement, Garden may display:

    Source requested: N
    Campfire confirmed: C
    Local adapter residual: max(N - C, 0)

C comes from the linked Jubilee need projection's confirmed units. This is a projection, not a mutation of the source slip.

If shared refresh is unavailable, cached/shared state may only be shown with an explicit stale/last-refreshed label.

## 19. Partial fulfillment

Jubilee already carries targetUnits and confirmedUnits, so partial completion is natural.

Example:

    source requested 4 cans
    Campfire confirmed 2 cans
    adapter residual 2 cans

A helper report alone leaves confirmedUnits and adapter residual unchanged.

## 20. Outside resolution and waiver

Band Runtime distinguishes confirmed receipt, resolved elsewhere, and waived. Current Jubilee shared authority does not expose equivalent first-class commands for the latter two.

V0 does not manufacture them as Campfire fulfillment. A later bounded design may add local-only outside-resolution state or new authority commands.

## 21. Error handling

Import failure: no held case and no Supabase call.

Local persistence failure: keep the case in memory for the session, visibly mark persistence failure, and never auto-promote.

POUR RPC failure: keep the source held, create no requirement link, show the authority-plane error, and allow retry.

Successful RPC followed by refresh failure: preserve the successful authority receipt/link, show refresh pending/failed, and do not repeat openNeed merely because projection refresh failed.

## 22. UI placement

Preferred first embodiment: Garden / Today, with a small Held Help Slips section under connection/status and before generalized household intelligence.

Garden already answers what remains unresolved, and NanaSpork already distinguishes This device from Shared.

A focused detail sheet/modal may show immutable source payload, local residual, imported occurrence count, linked Campfire needs, and POUR preview.

Do not overload Universal Create. An imported foreign Help Slip is not a locally authored proposal.

## 23. Truth labels

Required visible labels:

- Held on this device
- Not shared
- Shared to <Campfire>
- Delivery reported
- Receipt confirmed
- Partially confirmed
- Shared status unavailable / stale

Forbidden collapsed labels:

- Done from report only;
- Fulfilled from pledge or acceptance;
- Shared before authority receipt;
- Verified requester from local import.

## 24. Privacy

Held Help Slips are excluded by default from Gemini, BananaBot context, Intelligence summaries, Porch chat, shared Campfire projections, Jubilee witness history, and analytics/telemetry payloads containing request content.

Only the explicit POUR projection crosses into shared authority.

## 25. No live Band Runtime dependency in v0

Band Runtime remains the canonical semantic reference, but NanaSpork v0 does not add a runtime/package dependency on the Band Runtime repository.

Reason: the repos deploy independently and no stable published package boundary exists yet.

V0 proves compatibility through duplicated minimal contract types, exact serializer behavior, golden hash fixtures, and lifecycle mapping tests.

    COMPATIBILITY BEFORE SHARED DEPENDENCY

## 26. First acceptance specimen

Minimum proof:

1. import one valid Nourish Help Slip containing a 2-can missing requirement;
2. verify Held on this device / Not shared;
3. close and reopen the app;
4. verify the same local case and payload hash return;
5. import the same semantic payload with different whitespace;
6. verify a second receive occurrence but one held demand;
7. select the 2-can requirement;
8. preview the exact Campfire projection;
9. cancel and verify no shared need exists;
10. reopen POUR preview and confirm;
11. receive a successful real Jubilee authority receipt;
12. store the real authorityNeedId link;
13. refresh Campfire projection;
14. verify the Garden card shows shared need separately from immutable source;
15. pledge and report through the existing lifecycle;
16. verify report alone does not reduce confirmed residual;
17. confirm exactly 1 can;
18. verify source requested 2, confirmed 1, residual 1;
19. close and reopen;
20. verify the link and residual reconstruct without altering the Help Slip.

Acceptance statement:

> One foreign Help Slip can be held privately on a device, explicitly poured requirement-by-requirement into an authenticated Campfire, and remain linked to partial shared fulfillment without turning import into publication or report into confirmation.

## 27. Explicit non-goals

V0 does not add QR scanning, camera import, public routing, service discovery, helper matching, automatic Campfire selection, automatic POUR, urgency ranking, deservingness scoring, reputation, payment, cross-device hold sync, server-side Help Slip inbox, TranchNode integration, BODY declaration, HINGE/Dogram runtime dependency, shared outside-resolution commands, shared waiver commands, source-metadata publication, or a generalized need schema migration.

## 28. Testing requirements

At minimum cover:

1. strict Help Slip admission;
2. Band Runtime golden hash compatibility;
3. whitespace-different carrier / same payload identity;
4. duplicate arrival / single held case;
5. persistence reload;
6. malformed stored state fails closed;
7. no Supabase call during import/HOLD;
8. heterogeneous requirements remain separate;
9. POUR preview exactness;
10. cancel creates no shared need;
11. unauthenticated/no-membership POUR fails closed;
12. successful POUR stores a real authority ID only after RPC success;
13. partial confirmation residual;
14. report does not reduce residual;
15. refresh failure after successful POUR does not repeat openNeed;
16. source metadata stays out of shared RPC payload;
17. held data stays out of AI/intelligence context;
18. existing Campfire lifecycle tests remain green.

## 29. Promotion boundary

A green adapter proves only:

> NanaSpork/Garden can privately hold a Band Runtime-compatible Help Slip and explicitly project selected requirements into its existing authenticated Campfire need lifecycle while preserving source immutability and report/confirmation distinctions.

It does not prove live multi-user RLS isolation, network reliability, physical Android behavior, general mutual-aid deployment, federation, requester identity, correctness of the source need, or sufficiency of community capacity.

## 30. Follow-on order

After this adapter is green:

1. add Nourish's dedicated readable / print-safe Help Slip;
2. run one two-device trusted-circle handoff;
3. add outside-resolution / waiver semantics if the real specimen needs them;
4. inspect the lifecycle adapter with HINGE + Dogram;
5. only then consider QR import, shared contract packaging, or BODY declaration.

The law remains:

    RECEIVE
      -> HOLD
      -> HUMAN REVIEW
      -> POUR
      -> SHARED AUTHORITY

    NOT

    RECEIVE
      -> PUBLISH
