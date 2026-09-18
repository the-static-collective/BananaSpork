> **Active edge:** `feat/campfire-conversation-field-proof-001` — live-field proof frontier. The Help Slip return membranes are canonical on `main`; this edge adds a member-scoped shared conversation plane and prepares FIELD-SPECIMEN-001 without collapsing conversation into Jubilee authority.

# NanaSpork / BananaGram

NanaSpork is an Android field instrument for household participation. Its Garden
home makes lineage, unresolved needs, and available next actions legible without
turning the underlying history into a social feed.

The product names describe separate responsibilities:

- **NanaSpork** is the Android field instrument.
- **Garden** is the humane home and navigation projection.
- **BananaGram** is a portable participation envelope that keeps its lineage.
- **Campfire** is the household or community scope.
- **Jubilee** is the authority, lineage, and durable-memory kernel.
- **Donkey** is the device-private pause and reframing layer.

Garden is a presentation layer over the existing Jubilee events and receipts. It
does not create a second ledger or replacement ontology.


## Shared Campfire conversation

This edge adds the first durable shared text conversation plane:

```text
authenticated Campfire member
  -> circle_messages
  -> member-scoped RLS
  -> Realtime INSERT delivery
  -> durable rehydration after restart
```

Messages are deliberately separate from `witness_events`. The browser sends only
`circle_id + body`; `sender_user_id` is derived from `auth.uid()` and checked
again by RLS. The table grants authenticated clients only `SELECT` and `INSERT`;
there is no message update/delete surface in v0.

The checked-in migration is a deployment candidate, not evidence that a live
Supabase project has been changed. Apply it only to the intentionally selected
BananaSpork project, then perform the two-account / hostile-nonmember isolation
proof in [FIELD-SPECIMEN-001](docs/field-specimen-001.md).

```text
MESSAGE != WITNESS EVENT
CONVERSATION != LEDGER
CLIENT MESSAGE != CLIENT-ASSERTED SENDER IDENTITY
```

## Garden Help Slip adapter

Garden now has an experimental device-local handoff path:

```
Nourish Help Slip
  -> Garden device HOLD
  -> human review
  -> per-requirement POUR
  -> authenticated Jubilee need.opened
```

Import is not publication. A valid `fulfillment-envelope/v0` is first held on
this device, with duplicate arrivals preserving one local demand identity.
Nothing enters Supabase merely because a Help Slip was pasted or reviewed.

POUR is explicit and per requirement. Quantity and unit are preserved from the
source requirement; heterogeneous requirements are never flattened into a
generic shared quantity. Source recipe IDs, envelope IDs, payload hashes, full
purpose text, and unselected requirements remain local by default.

The shared lifecycle remains:

```
need.opened
  -> offer.pledged
  -> offer.accepted / declined
  -> fulfillment.reported
  -> fulfillment.confirmed
```

A delivery report is not a receipt confirmation. Shared residual display is
derived from confirmed units only.

This v0 adds no QR import, helper matching, ranking, reputation, public routing,
payments, cross-device HOLD sync, or new Supabase schema. It also does not prove
live two-account RLS isolation or physical Android behavior; those remain
separate verification frontiers.

## Current implementation

- React 19 and Vite provide one client for web and Capacitor Android.
- Express hosts the production client and server-side Gemini routes.
- Supabase Auth establishes the user session. Active Campfire membership is loaded
  from the database rather than inferred from client metadata.
- The shared need lifecycle uses authenticated RPCs and reloads durable projections
  after successful commands.
- Unsupported mutations remain visibly local or proposed.
- Held Donkey drafts stay in device storage and are excluded from shared/model
  contexts.
- AI output is an `agent_proposal`; it cannot claim `human_witness`.
- Web and server artifacts are built into separate directories. The Android APK
  contains only `dist/client`.

The detail experience is organized around three questions:

1. How did this become what it is?
2. What remains unresolved?
3. Where can someone participate next?

Visible truth states remain distinct: **This device**, **Proposal**, **Shared**,
**Human witnessed**, **Current form**, and **Chain verified**.

## Authority boundary

The shared authority plane currently supports the need/offer/fulfillment path:

```text
open need → pledge → accept or decline → report → confirm → close
```

The client never manufactures shared receipt IDs, sequence numbers, or hashes.
Shared actions require all three of:

1. valid Supabase public configuration;
2. an authenticated session;
3. an accessible active Campfire membership.

Otherwise NanaSpork runs in an explicit local-demo mode. General harvest,
BananaGram ancestry mutations, unrestricted attachments, and a general witness
command still need hardened, idempotent backend authority before the UI may present
them as shared history.

## Local setup

Requirements:

- Node.js 22 or newer
- npm
- a Gemini API key for server-side AI routes
- optional Supabase project configuration for shared Campfire mode

```bash
npm install
cp .env.example .env
npm run dev
```

The development server listens on `http://localhost:3000`.

Environment variables:

| Variable | Runtime | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server only | Gemini requests; never prefix with `VITE_` |
| `VITE_SUPABASE_URL` | Public client config | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public client config | Supabase publishable key |
| `VITE_API_BASE_URL` | Client build | HTTPS Express origin used by the Android app |
| `NATIVE_API_ORIGINS` | Server | Allowed Capacitor WebView origins |

Client-visible Supabase values identify the project; authorization still depends on
the signed-in user and database RLS. Never put a service-role key, Gemini key,
Android signing key, or other privileged credential in a `VITE_` variable.

## Verification and production build

```bash
npm run lint
npm test
npm run build
npm start
```

The production build writes:

```text
dist/
├── client/                 # browser and Capacitor assets
└── server/server.cjs       # Express server only
```

`GET /health` is unauthenticated and does not require Gemini or Supabase.

## Android debug build

Android requirements:

- JDK 21
- Android SDK Platform 36
- Android Build Tools 35.0.0 or a compatible newer installation

Build the APK with the real deployed HTTPS API origin:

```bash
VITE_API_BASE_URL=https://your-api.example npm run android:build
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The package ID is `collective.app.bananagram`, the minimum SDK is 24, and the target
SDK is 36. The debug build requests only Internet and network-state access. Android
backup and cleartext traffic are disabled.

The generated `android/local.properties`, Gradle caches, APK outputs, and copied web
assets are intentionally ignored. Commit the Android project source, not a bundled
SDK or generated build tree.

## Evidence and remaining proof

The local suite covers domain invariants, disposition/privacy semantics, canonical
hash fixtures, lifecycle role gates, safe runtime configuration, and client/server
build separation.

It does **not** prove:

- live two-account Supabase/RLS isolation;
- a complete real-device need lifecycle;
- cold boot, keyboard, back-button, and force-close behavior on every phone;
- future harvest or BananaGram graph authority that has not been implemented.

A successful build is evidence that an artifact was produced—not evidence that a
physical device or a hostile second account was tested.
