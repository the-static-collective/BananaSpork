# FIELD-SPECIMEN-001 — live Help Slip return proof

This is the next acceptance boundary for the community-help road.

The repository can prove contracts, serialization, local replay, and refusal
behavior. It cannot manufacture a real second account, a real human confirmation,
or a physical delivery. Those observations belong in the field receipt.

## Preflight

Before the live specimen:

1. Apply the `circle_messages` migration to the intentionally selected
   BananaSpork Supabase project.
2. Confirm two independent authenticated accounts can join one Campfire.
3. Confirm a non-member account cannot select or insert `circle_messages`.
4. Confirm Realtime rehydrates after browser/app restart.
5. Run `npm run lint`, `npm test`, and `npm run build`.

The shared conversation plane is deliberately separate from `witness_events`.

```text
message != witness event
conversation != ledger
sender identity != client assertion
```

## Live specimen

Use one grocery Help Slip with at least two requirements.

1. Create one Nourish `fulfillment-envelope/v0`.
2. Import the same semantic payload twice.
   - expected: one held demand, two arrival occurrences.
3. Have two authenticated accounts enter the same Campfire conversation.
   - expected: persisted text exchange and hostile non-member isolation.
4. POUR one requirement.
5. Record a helper delivery report.
   - expected: residual does not fall.
6. Confirm only part of the requirement.
   - expected: residual falls by the confirmed amount only.
7. Kill/restart the participating browser/app.
   - expected: conversation, held demand, and consequence state rehydrate.
8. Emit `help-case-status/v0` and return it to Nourish.
   - expected: source envelope remains immutable.
9. Optionally select one `receipt.confirmed` occurrence for Book of Acts human
   review.
   - expected: no automatic compile, token, score, value, or authority.
10. Leave an unresolved source item unresolved.

## Multi-Campfire restraint

The Garden adapter already refuses to add aggregate confirmations from several
Campfires when it cannot prove whether they refer to distinct underlying
confirmation occurrences.

Do not weaken that rule by substituting database event IDs. Event IDs identify
records; they do not by themselves prove that two records describe different
physical deliveries.

Until a shared confirmation-occurrence reference lawfully crosses the authority
boundary:

```text
ambiguous multi-link confirmation -> conservative lower bound
record identity != physical-occurrence identity
```

## Field receipt

Preserve one receipt packet with:

- source envelope id + payload hash;
- all arrival occurrence ids;
- held-case id;
- requirement -> Campfire -> authority-need links;
- account roles used for the isolation test (no passwords/tokens);
- conversation message ids needed to prove persistence only;
- report event id;
- confirmation event id(s);
- residual before report, after report, and after confirmation;
- restart/replay observation;
- returned status packet hash;
- source-envelope hash before/after return;
- optional Book of Acts draft id;
- unresolved remainder;
- failures, retries, or uncertainty.

Do not put passwords, raw invitation tokens, service-role keys, or private
household context in the receipt packet.

## Pass law

```text
duplicate arrival != duplicate demand
message != witness event
report != confirmation
many projection edges != many source requirements
requested + excess = confirmed + elsewhere + waived + residual
restart != reset
returned status != rewritten source request
historical draft != automatic Book of Acts receipt
```
