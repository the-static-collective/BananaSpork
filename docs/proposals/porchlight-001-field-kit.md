# PORCHLIGHT-001 — Operator Field Kit (draft)

**2026-10-27. Prelaunch only.** This is a conversation and partner-discovery packet; it does not confer authority to operate a shelter or arrange a home stay.

## First contact: an existing local service operator

**Subject: Small, supervised neighbor-support pilot — collaboration inquiry**

> Hello. We're developing Porchlight, a proposed volunteer coordination layer that would help existing homelessness-response providers turn vetted offers of food, laundry, transport and other specific resources into confirmed assistance, with privacy and consent preserved. We are not launching an independent shelter or recruiting people into unverified home stays.
>
> We are starting with two very different geographic profiles—large-metro Los Angeles and rural Humboldt County—to learn where additional neighbor capacity could reduce friction without duplicating coordinated entry. We are looking for a conversation with a local operator, and for the involvement of a paid or otherwise properly supported reviewer with lived experience of homelessness.
>
> Is there a bounded category of nonresidential assistance your team needs, and a staff member who could help determine whether a small supervised test is appropriate? If so, we'd seek your screening, safety, referral, privacy and confirmation requirements *before* any action.
>
> The Static Collective / Porchlight-001. No partnership or field deployment is claimed.

**Do not send as an official organization representing an unapproved partner.** Customize local scope and identity; log date, recipient and whether explicit permission to follow up was granted.

## Human steward intake — no client biographies

During **initial partner discovery**, record only:
- Geography / CoC code
- Partner entity and permission to contact (business information only)
- Named role **after consent** and secure contact channel (not in public repo)
- Which support categories may be appropriate
- Who is responsible for triage, eligibility, safeguarding, after-hours escalation, and resolution
- Whether there is a lived-experience reviewer with actual veto/repair rights
- Legal/data approval status and evidence reference
- Open blockers, owner and next review date

**Do not collect** street-location details, guest names, medical histories, protected identities, immigration status, trauma stories, domestic-abuse shelter locations, or a host's precise home address in public fields.

## Volunteer interest wording (prospective only)

> I may be willing to contribute [meal / laundry / ride / supplies / volunteering / lawful indoor space requiring separate screening / other]. I understand this is an *interest expression*, not an assignment, confirmed placement or authorization to offer shelter. My contact details will not be public. I can decline or withdraw. A qualified local operator must approve any safety-sensitive action.

Public-facing interest form requires an actual privacy notice, named controller/operator, secure storage, deletion path and spam/abuse controls before launch. **No direct guest-to-host matching.**

## Resource handling categories

- **GREEN, once partner-authorized:** bounded nonresidential supplies, paid-for transit ticket, meals distributed through partners, sanitation and laundry coordination. Transportation still requires insurance, safe pickup and participant agreement.
- **AMBER:** lawful indoor home sharing, vehicle overnight parking, day-use rest areas, storage of possessions, access to a private shower. Requires extra local-specific checks and explicit approval.
- **RED / not an ad-hoc Porchlight-001 placement:** backyard tent occupancy where unpermitted or unsuitable, unassessed private addresses, minor or specialist DV shelter placements, services contingent on labor or proselytizing, unscreened direct contact, daily involuntary relocation.

## Disposition and receipt states

`NEED PROPOSED` (guest/caseworker) → `HOLD` (local operator) → `ELIGIBLE SUPPORT` → `OFFER VERIFIED` → `PROPOSED CONNECTION` → `PARTIES CONSENT` → `ACCEPT / REFUSE` → `REPORT` → `RECEIVER CONFIRM` → `FOLLOW-UP / CLOSED`.

Each transition records actor role, consent scope, timestamp, originating case token, previous state and reason when a matter is held or refused. Use pseudonymous local references, not public client IDs. Authenticated confirmation by the *recipient or their authorized advocate* is separate from helper self-report. Do not auto-publish receipts; public metrics aggregate only after anti-reidentification review.

**Operator review board:**
- Red flag or adverse event → immediate HOLD and qualified safeguarding review.
- No local operator → no human case records.
- No response → unresolved, not confirmed.
- Revoked consent → stop new transfers, apply retention/deletion policy and notify relevant human steward.
- Emergency tonight → local 211 / official emergency shelter outreach route, **not** an unstaffed Porchlight waiting list.

## Sample synthetic test, no real people's data

```json
{
  "pilot": "porchlight-001",
  "case_token": "synthetic-la-01",
  "region": "LA-CoC",
  "need": {"category": "laundry", "quantity": 1, "unit": "load"},
  "provenance": "synthetic-fixture",
  "public": false,
  "state": "HOLD",
  "receiver_confirmation": null,
  "notice": "TEST DATA ONLY — NO LIVE SERVICE"
}
```

Expected outcomes: HOLD without operator; refuse unauthorized cross-region export; return no public exact location; accept only when local steward verifies eligibility and consent; do not count reported offer as completed act; on cancellation preserve a minimal disposition receipt and apply deletion policy.

## Go/no-go scorecard (empty until a real human signs)

| Gate | LA | Humboldt | Evidence / responsible local person |
| --- | --- | --- | --- |
| Local operating partner identified and accepts role | NOT MET | NOT MET | — |
| Lived-experience reviewer engaged with meaningful authority | NOT MET | NOT MET | — |
| Written safeguarding/incident/grievance procedure | NOT MET | NOT MET | — |
| Privacy/controller/access and retention approved | NOT MET | NOT MET | — |
| Nonresidential trial activity and liability covered | NOT MET | NOT MET | — |
| Consent and partner-controlled triage tested | NOT MET | NOT MET | — |
| Emergency referral and withdrawal route validated | NOT MET | NOT MET | — |
| Separate legal approval of residential activities | NOT MET | NOT MET | — |

**No casework or overnight assignments until the local operating partner expressly opens that activity after the required gates.**

## Pilot metric worksheet (aggregate, weekly)

Report region, reporting week, offered categories, vetted offers, accepted referrals, confirmed completed acts, unresolved cases, reported safety incidents (aggregate only), housing-navigator referrals, median triage lag, and reason for any pause. Show denominator and missingness; no individually identifying rows in a public file.

## Gates for next build

- Permissioned partner-operator workspace with role-based access; not a public chat.
- Separate volunteer interest from verified support capacity.
- Clear no-service/no-availability state; urgent-help signposting.
- An independent grievance channel, not just the matched host's moderator.
- Pseudonymous reLATTE receipts retained under local operator authority.
- Two-account isolation and restart tests before live case intake.

**Related:** [National pilot scope](porchlight-001-national-pilot.md).
