# POSSIBILITY ENGINE 001 — the smallest missing bridge

**Status:** local-only, opt-in, synthetic-first research specimen. **Owner:** NanaSpork/Garden for the participant-facing pilot. No Jubilee, Corpus OS, TranchNode, MOTIF, or Supabase authority has changed.

## The decision

Can the system identify a previously overlooked combination of voluntary capacities, ask the smallest useful missing question, and produce one **independently verified beneficial human act** with less coordination effort than ordinary direct conversation?

This is an evidence-first test, not a new people registry, fundraising service, universal matchmaker, or autonomous organizer.

## Built in this change

- Mobile-friendly static `/possibility/` page under Garden's `public/`; local-only JavaScript with no networking, telemetry, authentication, or cross-app writes.
- Up to 10 explicitly named requirements, 10 authority/safety gates, and 12 voluntary candidate offers. Every offer lists exact requirements and optional prerequisites; no semantic inference or hidden ranking.
- Bounded deterministic exhaustive composition (maximum 4096 subsets). First maximize potentially covered requirements, then currently available coverage, then minimize unconfirmed offers and total number of offers.
- Dependency closure refuses cyclic mutual prerequisites without a seed. Withdrawn offers cannot be selected.
- `HOLD`, `REFUSED_GATE` or `READY_FOR_INVITATION_ONLY`; even READY does not contact, assign, commit, allocate, verify, or execute.
- One next question, prioritizing refusal, missing capability, unresolved dependency, permission and unconfirmed availability.
- Local self-attested, requirement-specific OFFER_ACCEPTED → FULFILLMENT_REPORTED → FULFILLMENT_CONFIRMED. Reporter cannot confirm their own report under the same alias. Different aliases are not verified identities. The UI freezes the planning draft after its first recorded occurrence.
- Private-by-default JSON export/import. The exported packet expressly states `LOCAL_SELF_ATTESTED_IDENTITIES_NOT_AUTHENTICATED`, `authority: NONE` and the absence of physical delivery proof or cryptographic signing.

## Refusal and authority laws

```text
POSSIBILITY != AGREEMENT
MATCH != ALLOCATION
AVAILABLE != ACCEPTED
ACCEPTED != PERFORMED
REPORT != CONFIRMATION
DISTINCT ALIASES != INDEPENDENT AUTHENTICATED PERSONS
LOCAL RECEIPT != BOOK OF ACTS ADMISSION
TRANSPORT != AUTHORITY
REFUSAL != ERROR
```

Local browser storage is not tamper-resistant and user-imported JSON can replace case history. Never portray the local event log as canonical external evidence. Avoid entering personal names, addresses, health details, or raw invitations. Public sharing requires separate human review and consent.

## Synthetic fixture

Available oat-flour donor, unconfirmed cook (needs ingredient), unconfirmed driver (requires packaging); required venue and food-handling permission left open. The machine must ask the authorized host rather than claim anyone is committed or food is safe.

## First voluntary field trial

1. Select one real, nonurgent and modest request with a willing organizing host. If food is involved, the host independently reviews food handling, allergies and venue safety.
2. Run an ordinary direct-conversation or paper-note **baseline**. Measure the time, number of questions, fulfilled/unfulfilled portions and actual result.
3. Record only genuinely volunteered candidate capacities in the engine. Examine one proposed bundle and next question; no automated contact.
4. Seek permissions outside this tool. If a real act happens, preserve the contributor report and a **different actual person's confirmation** using the source owner's own channels. Two typed aliases on one device do *not* establish independence.
5. Export only the agreed, redacted local ticket. A separate authorized human reviewer may later consider a Book of Acts draft. No automatic promotion.
6. Compare with baseline: did something beneficial actually happen, was it newly feasible, did the software save coordination work, and did it create a repeatable voluntary capacity?

**Pass:** owner-confirmed occurrence plus a measurable coordination advantage. **Null:** a simple human conversation performs equally well. **Stop:** permission absent/refused, unsafe handling, coercion, privacy leak or fabricated receipt.

## Reproduce

```bash
node --test tests/possibility-engine.test.mjs
```

Node 22+, no extra dependencies. Existing Garden `npm test` incorporates the proof suite after the script update. After an approved branch deployment the static page is `/possibility/`; creating this PR does **not** deploy or link it in Garden navigation. A separate standalone HTML file may be produced by inlining `engine.mjs` for offline file opening.

## Next integration gates, not delivered

- Explicitly accepted, owner-authorized Garden Help Slip HOLD adapter.
- Independently authenticated participants, safe recipient scoping, withdrawal and retention review before any hosted multi-user pilot.
- Human-reviewed MEMENTO Return Ticket and owner-approved Jubilee Book of Acts projection.
- Native MOTIF method comparison versus a pre-registered simple baseline. This specimen is **not** a native MOTIF benchmark.
