# First Circle as a Garden feature (001)

**Status:** reviewable code candidate, not a live-field or production rollout.

First Circle is an independently scoped **pocket-world instrument** reachable from the Garden home. It runs in a standalone HTML file inside a full-height Garden view, and the same file can be opened without the app.

## Entry and workflow

```
Garden Today → OPEN FIRST CIRCLE (#first-circle)
  → choose NEED / OFFER / ACT / QUESTION
  → write a short card
  → ADMIT HERE or REFUSE HERE
  → explicit RELEASE TO SHARE (ADMIT only)
  → SHARE WITH SOMEONE / COPY POCKET PACKET / JSON
  → receiver opens another copy, chooses MAILBOX → RECEIVE
  → receiver's claim is HOLD until their own decision
  → optional HAVE A CHILD → standalone HTML with only released cards
```

From the feature wrapper, **Back to Garden** returns to `#garden` without discarding the separate instrument. **Open standalone** navigates to the self-contained static HTML. No Vercel-specific API, AI provider, new database table, or account is required by the instrument.

## User-visible boundaries

- A receipt is a **local unsigned hash chain**. It detects changed bytes under the supplied history; it is **not** a digital signature, verified identity, verified event, or proof that a deed happened.
- The browser persists this feature's local world in `first-circle-001:*` browser storage if available. Private browsing, eviction, and native WebView storage can lose data. Status shows **MEMORY ONLY** if saving fails; users should export an audit if preservation matters.
- Sharing requires an explicit ADMIT, explicit RELEASE, and a manual share choice. The Share button tries the device's native share sheet, then falls back to copy/paste. No automatic network call to another person or background sync.
- A recipient is not automatically enrolled, assigned a duty, or credited with capacity. A received claim is a candidate on HOLD. The First Circle asset **never writes to Jubilee/Campfire/Supabase**.
- Forking downloads a new self-contained HTML **file** whose released text is embedded. The child has a distinct world identity, and **all inherited claims arrive on HOLD**. Do not share cards containing private case details.
- No authenticated people, signed reLATTE crossings, payment, automatic need-to-offer matching, verified fulfillment, hosted backup, or cross-device sync is established by this integration. Do not represent it as the existing shared Garden help lifecycle.

## Verification

Run:

```
npm run test:first-circle
npm run lint
npm run build
```

The standalone test checks SHA-256 fixtures, deterministic replay, duplicate and conflicting events, tamper detection, divergence, inherited HOLD, pocket validation, return-loop replay/decision boundaries, visible native share fallback, and route/link wiring.

**Required field smoke test:** Open Garden on device A; choose First Circle; create and release a synthetic card; share a packet to device B; open Garden or a standalone First Circle on B and receive; verify HOLD; refuse on B; verify A is unchanged; have a child on A and open the downloaded HTML; verify the child's inherited card is HOLD. Confirm same behavior after an application reload and confirm there is no Campfire mutation. Explicitly test browser/web and separately test Android Capacitor: the latter's download/share behavior is unverified.

## Consequence-001: first functional return circuit

A separate **Consequence Desk** turns a claim into an inspectable two-world work exchange without granting authority to either world:

```
WORLD A: make NEED / OFFER → ADMIT → RELEASE → share claim packet
WORLD B: RECEIVE → HOLD → ADMIT → Consequence Desk
WORLD B: PLEDGE STEP → share work-return packet
WORLD A: mailbox import → ACCEPT / DECLINE / DISCUSS → share decision packet
WORLD B: mailbox import → receive origin's decision
WORLD B: REPORT WHAT I DID → share fresh work-return packet
WORLD A: mailbox import → CONFIRM LOCALLY / DO NOT CONFIRM / DISCUSS
WORLD B: mailbox import → see independent origin response
```

The direct REPORT path does not require a prior pledge. The work journal is locally replayable and hash-chained, **separate from** the First Circle claim journal. It is stored as `first-circle-work-001:<worldId>`; each world may `EXPORT PRIVATE WORK AUDIT`. Duplicate return/decision packets are idempotent; malformed references, altered hashes, conflicting decisions, sending in someone else's world, and self-originated responses are rejected.

Each transfer is deliberate, through the device share sheet, copy, or JSON file. The receiving world retains independent judgment. Work packets do not silently update Garden, Jubilee, or the beneficiary's records. Any "confirmed" outcome remains **local, explicitly unauthenticated and potentially false**; it is not a Full Measure verified deed. The source card must remain ADMIT/released locally to receive an incoming return; the respondent must have admitted a foreign NEED/OFFER card to send one.

**Executable proof:** `npm run test:first-circle` includes two-world pledge → origin acceptance → separately reported act → local confirmation → returned decision, with hostile mutation/duplicate tests and child-export DOM scrubbing. A two-page Chromium manual smoke proof also exercised the full cycle. Still unverified in production: live device-to-device transport, real humans, Android WebView/Capacitor share and download, filesystem storage permissions, authenticated key ownership, consent for sensitive information, and actual delivery to beneficiaries.

**Child privacy:** the child's copied HTML clears the live rendered card, work list, and packet preview before serialization. No return journal is inherited; children only receive explicitly released claim text on HOLD.

## Consequential next boundary

The next useful field proof is **one real, consented, low-risk exchange** between two people, with two different devices, for one bounded need. Record whether the recipient actually received help through independent human confirmation. This specimen must not claim real-world completion from its own UI.

**Core rule:** The claim may travel. Its meaning and authority do not.
