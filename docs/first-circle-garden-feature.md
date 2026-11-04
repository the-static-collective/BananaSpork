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

The standalone test checks SHA-256 fixtures, deterministic replay, duplicate and conflicting events, tamper detection, divergence, inherited HOLD, pocket validation, visible native share fallback, and route/link wiring.

**Required field smoke test:** Open Garden on device A; choose First Circle; create and release a synthetic card; share a packet to device B; open Garden or a standalone First Circle on B and receive; verify HOLD; refuse on B; verify A is unchanged; have a child on A and open the downloaded HTML; verify the child's inherited card is HOLD. Confirm same behavior after an application reload and confirm there is no Campfire mutation. Explicitly test browser/web and separately test Android Capacitor: the latter's download/share behavior is unverified.

## Known product gap / next slice

This feature presently moves **claims** between worlds. It does **not** close a real-world assistance loop by itself. The next slice should add a separately reviewed return/disposition packet and a beneficiary-confirmed action path rather than turning another invitation into the next action.

**Core rule:** The claim may travel. Its meaning and authority do not.
