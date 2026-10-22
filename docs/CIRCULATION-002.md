# CIRCULATION-002 — BananaSpork becomes the first source-owned receiving world

**2026-10-22 · experimental / DRAFT / HOLD.**

## Actual source-native boundary

A named repository on a Free Graph invitation is **not** its assent. CIRCULATION-001 proved an abstract three-repository circulation and **simulated** its destination responses. This branch tests what happens when the actual BananaSpork code independently receives the proposal.

```text
CANNON fictional seed
    -> native Free Graph v0 packet (source hashes validated)
    -> native planZ two-door offer-set (synthetic-only, cold verified)
    -> explicit standalone input bundle, with planZ's simulated replies REMOVED
    -> native BananaSpork verify/preview
    -> no automatic Help Slip, task, Campfire, PENNY, broadcast or money
    -> human-controlled local HOLD or DECLINE
    -> separate, hash-bound `banana-spork.circulation-local-reply/v0`
    -> voluntary local export, no autonomous network transmission
```

## Implementation

- `src/domain/circulation/circulation002.ts`: actual browser-compatible, local-first BananaSpork receiver. It rechecks Free Graph content addresses, the two explicit graph paths, separation of CARE/CULTURE, and both domain-separated planZ hashes. It rejects modified source, unknown fields, authority promotion, copied CULTURE permissions, duplicate/contradictory local choices, and unreviewed submissions. It does not independently authenticate any sender.
- `src/domain/circulation/CirculationReviewBench.tsx`: opt-in import, preview, deliberate local HOLD or DECLINE and user-directed export/release. It appears **alongside** Help Slip Inbox but never calls `holdImportedHelpSlip` or `onPour`.
- `src/domain/circulation/circulation002.test.ts`: pure-source adversarial tests plus imported **real upstream-executed graph and planZ artifact** gate.
- `.github/workflows/circulation-002.yml`: immutable checkouts of existing CANNON, Free Graph, and planZ work. Runs the original native Python generator and validator, then feeds **that exact resulting offer-set** to BananaSpork TypeScript receiver. Runs the entire BananaSpork regression, typecheck and build.

The `banana-spork.circulation-input/v0` bundle is deliberately a **container for the original native Free Graph source graph and planZ offer_set**. It is not a new central authority, not an edge promotion and not a help request.

## First synthetic specimen

> FICTIONAL: garden extra produce.
>
> Native graph proposes separate CARE destination `the-static-collective/BananaSpork` and CULTURE destination `the-static-collective/static-live`.

The receiver examines only its CARE offer. An explicitly clicked `HOLD_LOCAL` or `DECLINE_LOCAL` goes to the **BananaSpork-owned** local store; it does **not** adopt the simulated planZ reply from CIRCULATION-001. The receiver creates an independent immutable reply hash. This local reply is explicitly `LOCAL_USER_SELECTION_UNAUTHENTICATED`; it is neither a named human's signature nor a verified project's organizational decision.

Reimport with the same offer/choice remains idempotent. An attempt to reverse the existing choice without first deliberately removing that local record is refused. Local release does not revoke any separately exported copies.

## What's still closed

- Fictional inputs only. The next milestone is a separately permissioned genuine external proposal, not promotion of these fixture answers.
- No shared registration, live Campfire, shared user accounts, broadcast, donation, needs fulfillment, creative publication, or physical delivery.
- No private contact fields. A text-shape gate rejects obvious contact patterns, but it does not replace competent human privacy review. A user should not paste real data into the practice importer.
- No conversion from a speculative proposal to `fulfillment-envelope/v0`. That would invent a real need. A separate human-authorized case-intake workflow would be required.
- The return file is user-controlled. It is content-addressed, **not cryptographically authenticated**. No CANNON reconciliation is automatically performed merely by exporting.
- No production or partner deployment. No Coalition, Waseca grocery, church or local organization endorsement inferred.

**Field gate:** review and approve a truly non-identifying question with a local steward, run an actual physical device test with human witnesses, distinguish offer/report/recipient confirmation, and only then consider a separately authenticated cross-world reply. This branch deliberately does not perform these steps.

## Reproduce

GitHub Actions on this branch runs source-native cold composition, TypeScript reception, existing help-slip and campfire tests, TypeScript checking, and build. `npm test` alone exercises a separately constructed fictional fixture when sibling repositories are unavailable.

**INVITATION ≠ ADMISSION. LOCAL HOLD ≠ NEED. CONTENT HASH ≠ SIGNED CONSENT.**
