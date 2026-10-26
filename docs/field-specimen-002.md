# FIELD-SPECIMEN-002 — the first independent Campfire witness trial

**Status on 2026-10-26:** test harness staged in a draft PR. There is **no selected, verified BananaSpork Supabase target** in the connected projects. **No live migration applied, no account enrolled, and no physical help/delivery established.**

### Why this exists

[FIELD-SPECIMEN-001](field-specimen-001.md) tells us what a lawful proof looks like; it correctly warns that source tests can't replace three actual independent account sessions. This packet turns that boundary into an **executable operator assessment** and a **single-card field test** that records the negative checks too.

The purpose is not to get a passing-looking badge. It is to discover whether two independently authenticated Campfire members can exchange messages and complete a small, real, permissioned Help Slip without a third person gaining access or a helper's report becoming a recipient's confirmation.

## Preflight: do not point this at the wrong Supabase project

The currently connected projects at authoring time were `the-autodiso` (inactive), `WITNESS` (inactive), and `pantry-gate` (active). A **read-only metadata check** on `pantry-gate` found **no** `public.circle_messages`, `public.circles`, `public.circle_memberships`, `public.witness_events`, or `public.households` tables. It is not thereby a NanaSpork authority project.

No Supabase project has been chosen as the BananaSpork owner. **Do not deploy this app's migration into pantry-gate just because that endpoint hosts BananaGram Pocket / Seven-Day Table.** Doing so could mingle isolated civic and household data.

Once an explicitly intended BananaSpork project is selected:

1. Confirm the application's client and server configuration both target **that same project**, without giving project secret or user passwords to this conversation.
2. Have the owner review and apply the checked-in `supabase/migrations/20260918173000_campfire_conversation_plane.sql` **only if it has not already been applied** and the project has the `bananagram_core.is_member_of_circle` dependency and `public.circles` in place.
3. Run `docs/field-specimen-read-only.sql` on that same project. It checks RLS, policies, least privilege and Realtime publication **metadata only**. A correct metadata result is **not** behavioral or security proof.
4. On intentionally isolated test accounts, set up three real login sessions: **A** (member), **B** (member), **C** (nonmember). Never copy their passwords, login links, access tokens, real contact names, beneficiary identities, or session cookies into the trial packet.
5. Run `npm run lint && npm test && npm run build` to confirm that this application builds. If those fail, stop and fix first.

## The 3-person table / phone field card

Use a test circle with no real household vulnerability data. The test can use a **small safe, permissioned grocery need** with a real owner, helper and recipient if everyone agrees. If no real partner is available, perform a dry run but label it synthetic and do **not** report an actual completed community action.

| Sequence | Person / action | Observable result to record | Failure that must stop promotion |
| --- | --- | --- | --- |
| 1 | Owner selects BananaSpork Supabase project | Project ref, applied `circle_messages` migration | Missing target, wrong target, missing RLS |
| 2 | A and B sign in **independently** | Separate authenticated sessions; both in same Campfire | Shared credential, simulated actor toggle |
| 3 | C signs in independently, not a member | Session active; zero membership in the target circle | C mistakenly receives a membership |
| 4 | A sends ordinary Campfire message | A's authenticated sender in record; message visible to B | UI-supplied sender, wrong-circle row |
| 5 | C attempts **SELECT** and **INSERT** on target circle | Both refused or SELECT sees no rows | C can read/insert even once |
| 6 | B closes/kills and restarts app; A does same | The existing messages and case state rehydrate | Local-only illusion, erased/shared state |
| 7 | Owner imports one Help Slip *twice* | One held demand, **two distinct arrival occurrences** | Duplicated demand |
| 8 | Owner intentionally pours **one** requirement into Campfire | Only that requirement opens shared need; other remains held | Automatic publishing or data leakage |
| 9 | Helper reports some quantity delivered | No reduction in source residual | Report treated as receipt |
| 10 | Recipient confirms **part** of the quantity | Residual drops **only by confirmed amount** | Report quantity substituted, overconfirmation |
| 11 | Owner returns `help-case-status/v0` | Source payload hash remains unchanged | Source request silently mutated |
| 12 | Leave one item unresolved | Unresolved status persists on restart/return | Invented success or automatic next assignment |

**Additional test:** If the requirement projects into two Campfires, do not add claimed confirmations without a distinct physical occurrence reference. When ambiguous, keep the conservative lower bound and label it non-exact, as [RETURN-OF-THE-HELP-SLIP-001](return-of-help-slip-001.md) requires. IDs for two database events **do not** themselves establish two physical deliveries.

## Keep the field packet deliberately boring

Record **only** the small status fields and opaque test-instance identifiers below; the source project owns real receipts. Do not collect actual chat bodies, private hardship descriptions, source-person identifying data, names, phone numbers, email, home addresses, medical details, screenshots with names, or authentication credentials.

Use an **independent human observer** to validate that A, B and C are real separate account sessions; nobody should mark the checklist `observed` based solely on a UI toggle or simulated test. The actual person whose need is involved controls whether and how they confirm a delivery.

The assessment accepts:
- `observed` — operator directly saw the condition under test;
- `failed` — something did not work, including security refusals;
- `not-run` — not yet tested, cannot infer success.

No boolean `verified=true` exists. An entirely completed record can at most be **`OPERATOR_REPORTED_READY_FOR_REVIEW`**. Source-owner validation and actual independent physical provision remain additional human decisions.

## Run the local verifier

```bash
npm run lint
npm test
npm run build

# The supplied JSON is synthetic, with all checks NOT RUN:
npm run field:check -- docs/fixtures/field-trial-example.json
```

Copy the JSON file **locally** and replace its placeholders as an operator, after actual field observations. Use the real BananaSpork project reference (20 letters/numbers), switch `synthetic` to `false` **only for a genuinely conducted trial**, change the checklist fields to what was observed, and update the arithmetic and source hashes. This only creates a reviewable operator report. Never upload the full unredacted record to public GitHub or Free Graph.

The sample quantities—24 requested, 14 helper-reported, 6 recipient-confirmed, 24 before/after helper report, 18 after recipient confirmation—illustrate exactly why `REPORT != CONFIRMATION`. They describe **no real milk, person or delivery**.

A failed hostile non-member read, forged sender, altered source hash, increased count caused by duplicate import, or quantity mismatch must stay `BLOCKED`. A synthetically completed example always stays `SYNTHETIC_EXERCISE`. No result emitted by this CLI is a Jubilee receipt or public Free Graph authority.

## Acceptance threshold

The *first* genuine success is a **source-owned, properly permissioned confirmed help occurrence** accompanied by proof that a nonmember cannot access the conversation and the source envelope wasn't changed. The human owner and recipient must actually confirm it. The original Help Slip remains the authoritative source; `GRAFT` and `Free Graph` can receive only separately reviewed, permitted public-safe summaries, **not household case histories or private receipts**.

**Readiness as of this PR:** executable field assessment and negative tests; project targeting, independent sessions, member RLS, real recipient confirmation, browser/Android testing and integration acceptance **remain unproven**.
