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
