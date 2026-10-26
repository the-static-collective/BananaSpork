# INHERITANCE-INTERRUPT-001 — seed without debt

**Status: executable local draft instrument; human field consent, operator deployment and live community action not verified.**

The inheritance interrupt is a way of passing forward *capacity to help*, never obligation. A person receiving help incurs **no duty to help somebody else**. Confirmed fruit does not automatically grow a seed; the future offer must be a new voluntary act, with its own author and independent permission.

## What exists

- `inheritance.mjs`: pure no-I/O gate with an exact five-field input. Requires `purpose=INDEPENDENT_NEW_OFFER`, `intent=I_OFFER_FREELY`, adult self-attestation, one allowlisted capacity kind and broad availability. Refuses every undeclared field, including names, contact details, private stories, recipient IDs, case IDs, or prior receipt references.
- `seed-card.mjs`: local command producing a private JSON hold packet and printable HTML *private review slip* in a newly created directory. It does not write Firebox SQLite or transmit data. No public print campaign or recruitment occurs automatically.
- `inheritance.test.mjs`: negative controls for implicit consent, extraneous sensitive context, refusal/no disclosure, exact source-controlled labels, no overwrites, and private review standing.

```bash
node --test campfire-backend/inheritance.test.mjs
node campfire-backend/seed-card.mjs --kind garden_work --availability one_off --intent I_OFFER_FREELY --output-directory ./private-seed-001
```

Do not commit or publicly serve `private-seed-001`. Operator must make a separate privacy decision about storing local packets. The caller's `adultSelfAttested` assertion is **not** age or identity verification; verify independently before a real-world field use. The CLI presently accepts that operator assertion and is not a direct public self-service enrollment tool.

Allowlisted capacities: `food_sorting`, `garden_work`, `small_repairs`, `setup_cleanup`, `digital_help`, `art_music`. Availability: `one_off`, `occasional`, `unsure`. There is deliberately no freeform text, location, identity, contact, helper history or exact schedule in the exported packet.

## Constitutional split

```text
HELP RECEIVED ──> source report ──> source-authorized confirmation ──> fruit
           └─X─> debt, volunteer assignment, public profile, inferred consent

INDEPENDENT ADULT ──> distinct present-day voluntary offer
  ──> bounded private review slip (HOLD)
  ──> real steward/identity/safeguarding review (NOT BUILT)
  ──> fresh task-specific contact permission (NOT BUILT)
  ──> separately authorized need/offer workflow, if desired
```

Offers may come from *anyone*, including someone who never received aid. Refusal, silence or opting out does not change anyone's access to support. `HOLD_FOR_PRIVATE_REVIEW` is not matching, approval, publication, identity proof, delivery evidence, a completed act, or a reputation score. No child-facing work or direct minor contact is authorized.

## Bounded seven-day field path

1. Meet the separate [self-owned Campfire security and restart specimen](FIELD-001.md). An unhosted backend/green CI test is not the actual three-adult field result; do not collect sensitive survivor or child information in this prototype.
2. Give one adult volunteer the choice to make a *new independent offer* or say no. Do **not** invite them as repayment for having been helped.
3. If they choose yes, run the private seed-card CLI with one general category; let the author inspect, refuse, or discard the paper.
4. A suitable human steward—not this software—independently checks adult identity, role suitability, safeguarding and new task-specific consent before any contact or sharing. That workflow is NOT automated.
5. The existing Campfire need/offer channel may separately facilitate one genuine request and report. A credential acceptance is not physical proof: independent recipient confirmation belongs with the recipient and source.
6. Record only a non-identifying outcome status: `not attempted / declined / draft prepared / reviewed / separately authorized / independently witnessed`, without converting unrelated people into a single inherited chain.

**Acceptance:** A real aid case may be confirmed *without any successor offer*. An offer may be independently prepared *without any earlier aid case*. No recipient is asked to repay support; no beneficiary identity or history crosses the offer boundary. Technical tests prove the refusal/packet contract, not human consent or positive field impact.

**Next proposed crossings (not implemented):** an authenticated steward review with explicit withdrawal and retention controls; opt-in task-specific contact within a verified Campfire; public-safe aggregate outcome receipt to GRAFT and Book of Acts only after authorized confirmation. No automated matching, direct outreach, public survivor database, or status scoring.
