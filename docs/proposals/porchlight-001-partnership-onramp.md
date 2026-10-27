# PORCHLIGHT-001 — Partnership on-ramp

**2026-10-27 · proposal / unapproved · DO NOT imply affiliation or current service availability**

## Start with a question, not a platform

**Pitch:** "What small task repeatedly falls through the cracks for your team? If you choose one, we can help recruit neighbor capacity and return a verifiable completion receipt—without making your staff manage a new intake system."

Porchlight adds a **neighbor-capacity edge** to local homelessness response. It does not claim to perform case management, shelter placement, eligibility screening, coordinated entry, HMIS, after-hours crisis response, nor to replace housing supply. We borrow existing public volunteer paths first.

## Partnership topology — independent seats

| Seat | Needed for | Controls / veto | Not responsible for |
| --- | --- | --- | --- |
| Existing service provider / operating partner | Chooses one real bottleneck and referral/fulfillment protocol | Can HOLD/REFUSE any request; local client intake remains theirs; accepts obligations in writing | Building Porchlight technology |
| Lived-experience reviewer (independent, compensated where feasible) | Accessibility, coercion, dignity, unintended burdens, feedback and grievances | Can require redesign and flag unsafe practice; not merely testimonial marketing | Handing over personal trauma as proof |
| Volunteer coordinator / community anchor | Recruits and orients practical helpers after provider approval | Verifies allowable offers, routes within permitted local scope | Screening guests, assigning beds, collecting sensitive histories |
| Technical steward (Static Collective proposed) | Optional partner-approved offer/need workflow, receipts, reports, training | Maintains app, adheres to written data boundaries; can stop unsafe integration | Holding original case records or overruling local operator |
| Housing navigator / Coordinated Entry | Housing pathway and appropriate referrals | Controls housing referrals using established system | Filling new Porchlight sign-ups as case intake |
| Independent safeguarding / privacy reviewer | Complaint, incident, breach and withdrawal processes | Can pause or terminate pilot under agreed criteria | Being the same person as unaccountable sole matchmaker |

A person experiencing homelessness is a **participant with voluntary choices and access to review**, not a database object or automatically matched recipient. An offer of a room does not become a verified/safe bed by being submitted.

## Lowest-friction adoption sequence

**0. Read-only / no-contact research.** Learn what an organization already requests publicly, and note its published volunteer/contact route. No claims of engagement.

**1. Useful first contact.** Ask for 15 minutes to understand one staffing/supply/logistics gap. No request to transfer client data; no slide deck, procurement request, or signed MOU at this stage.

**2. Public-path contribution.** Before proposing a platform integration, join or support the partner's **existing volunteer, donation or supply program** under its established procedures. Remote tech coordination may be offered only if useful.

**3. Manual partner-controlled trial.** The partner chooses a category, like shelter laundry turnaround, weather supply kits, arrival-home household goods, or volunteer shift fill. One named person at partner controls a weekly task list; helpers see only what they need; status travels by approved email, paper or CSV. Use synthetic cases for a demo.

**4. Minimal written letter of intent / pilot agreement.** Do this **before** any real referral data or public promotion as a partnership. State dates, scope, screening, insurance, labor/volunteer terms, permitted data, no-contact rules, withdrawal and stop rights. A binding MOU/data agreement only when warranted; legal review for sensitive scope.

**5. Integrate only the successful pattern.** At operator request, add signed reLATTE crossing receipts and local HOLD/ADMIT/REFUSE, not guest biographies. Account ownership, data controller and storage responsibilities remain local.

**6. Results review and a repeatable 'city kit'.** At 30 days, a joint decision expand/revise/stop; publish aggregate validated metrics only with explicit permission and small-cell privacy checks.

## Geographic differences

### LA: one provider/site and one service planning area, not all LA County

July 1, 2026: LA County Department of Homeless Services and Housing (HSH) assumed direct administration of previously separate County-funded contracts; LAHSA still describes itself as LA CoC lead. The LA CoC's Sep–Oct 2026 RFQ for FY2027 administrative roles means do **not** assume a stable administrative recipient for a new technology contract. Choose an established **direct-service organization** and ask about one site-level support gap. Existing access centers/CES remain the casework route.

**First conversation candidate:** The People Concern (Los Angeles), official volunteer channel volunteer@thepeopleconcern.org. Their public program already covers food service, donation sorting and case-support-adjacent volunteering with required onboarding, orientation/background checks; they describe 1,550+ volunteers. We should discover if *coordination friction exists*, not assume that they need a new matching app. Offer a one-page **provider-owned shift/supply confirmation workflow** only if invited.

**Additional routes:** PATH's volunteer/corporate team, including Welcome Home Kits and donation drives; LAHSA's CoC participation and lived-experience advisory routes. Do not portray oversight/civic contacts as operator approvals. LA-HOP/211/CES remain official client access.

### Humboldt: one provider and one public coalition door

HHHC (Humboldt Housing & Homelessness Coalition) is a multi-organization CoC with no dedicated staff and county administrative support; its website invites people to email HHHC@co.humboldt.ca.us to join and participate in bimonthly meetings. **Do not ask the coalition to operate our project.** Ask for an introduction to an appropriate independent service provider and to learn about specific rural barriers.

**First conversation candidate:** Arcata House Partnership, admin info@arcatahouse.org and volunteer@arcatahouse.org. Their own volunteer portal lists food-pantry work, donation sorting, and extreme-weather shelter support such as laundry/meal prep. Because those jobs already exist, an on-ramp can begin with a narrow proposal: can we help track one provider-chosen material/volunteer need across a week, without touching client intake?

**Do not imply** that Arcata House or HHHC has accepted or even received an invitation.

## The 15-minute partnership conversation

1. "What's one recurring unmet practical need for which you already have permission to recruit volunteers?"
2. "What would add work to your team? What would genuinely save staff time?"
3. "What is the **smallest useful outcome** we could help deliver without personal client data?"
4. "Who is authorized to approve/deny a volunteer and confirm the work happened?"
5. "What must never be shared, photographed, or put online?"
6. "What existing tools and training do you want us to use rather than replace?"
7. "Who with lived experience can review the design with an actual right to object?"
8. "Could we test on paper for one week and only then discuss software?"
9. "If it fails, how do we close it without leaving your staff or participants worse off?"

## Partner-owned work order: minimum schema (public/synthetic-safe)

```json
{
  "work_order_id": "synthetic-arcata-laundry-01",
  "scope": "authorized_provider_site_token",
  "category": "laundry-support",
  "window": "partner-defined",
  "originating_partner": "synthetic-example-only",
  "eligibility_owner": "local-operator",
  "person_identifier": null,
  "precise_location": null,
  "request_status": "HOLD",
  "matching_authority": "manual-partner-approval",
  "receiver_confirmation": null,
  "consent_scope": "synthetic-test",
  "source_kind": "SYNTHETIC_FIXTURE"
}
```

For real use: work-order identifiers must not encode person names, location, protected status or vulnerability. Publish no task with exact refuge address. A volunteer's self-attestation is `reported`, never `confirmed`. Human operator can reject and revoke. Don't infer shelter capacity from private support tasks.

## Partnership operations board, with evidence not hype

`IDENTIFIED → RESEARCHED → CONTACT AUTHORIZED → CONTACTED → LISTENED → OPERATOR INTERESTED → SCOPE AGREED → SAFETY APPROVED → SANDBOX PROVED → LIVE NONRESIDENTIAL PILOT → REVIEWED → EXPAND/REVISE/STOP`

No auto-advancement, no unsent email recorded as contact, no self-granted partnership logo. Require contact timestamp, owner, next step, access limits, approval reference, active HOLD reason and a way to record **DECLINED**, **NO RESPONSE** and **DO NOT CONTACT**.

Partner-relationship data and software receipts are **separate**. The public board gets organization-level status only, not internal negotiations or an individual's client/guest file.

## First 'we have' proof

A named, willing provider points to one sanctioned need → a steward asks what help would be useful → a volunteer offers a bounded resource under existing provider process → a qualified receiver verifies completion → a short, privacy-safe receipt records exactly what happened → the provider says whether this saved time.

**Stop conditions:** absence of a local owner; increased burden; coerced participation; a risk incident; inappropriate exposure of client/host location; inability to honor consent withdrawal; unconfirmed fulfillment presented as success.

## Relevant sources (checked 2026-10-27)

- LA County HSH July 1 contract transition: https://homeless.lacounty.gov/news/la-county-successfully-completes-transition-of-county-funded-homeless-services-contracts-to-streamline-system-and-improve-accountability/
- LA CoC FY2027 RFQ and timeline: https://losangelescoc.org/
- LA CES SPA leads and client access: https://www.lahsa.org/ces/home/accessingces/
- LAHSA lived experience + provider volunteer channels: https://www.lahsa.org/get-involved
- The People Concern volunteering, onboarding: https://thepeopleconcern.org/volunteer/
- PATH volunteer opportunities: https://epath.org/volunteer/
- HHHC meeting, coalition nature and contact: https://www.humboldtgov.org/2512/Humboldt-Housing-Homelessness-Coalition
- Arcata House volunteering: https://www.arcatahouse.org/volunteer
- Arcata House contacts: https://www.arcatahouse.org/contact
- Minnesota Avenues host-home toolkit (for **future**, separately licensed/approved room-hosting): https://avenuesforyouth.org/hosthometoolkit/

**Evidence line:** public information researched; outreach NOT sent; live data NOT accepted; operating partnerships NOT formed; first pilot NOT begun.
