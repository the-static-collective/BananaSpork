import React from 'react';

/**
 * A separate, device-local creative instrument. It is intentionally not backed
 * by Campfire Auth, Supabase, or Jubilee receipts. The contained HTML is a
 * self-sufficient file and can have offline children.
 */
export function FirstCircleFeature() {
  return (
    <div className="app-shell flex min-h-0 flex-col bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-3 py-3 sm:px-5">
        <a
          href="#garden"
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-slate-800"
          id="first-circle-return-to-garden"
        >
          ← Back to Garden
        </a>
        <div className="text-center">
          <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-200">
            First Circle · Pocket Worlds
          </div>
          <div className="text-xs text-slate-300">A claim travels. Authority stays local.</div>
        </div>
        <a
          href="./first-circle.html"
          className="inline-flex min-h-11 items-center rounded-xl bg-emerald-200 px-4 py-2 text-sm font-extrabold text-emerald-950 hover:bg-emerald-100"
          id="first-circle-open-standalone"
        >
          Open standalone ↗
        </a>
      </header>
      <div className="border-b border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs text-slate-200">
        This world saves on this device only when browser storage permits. Sharing is manual and opt-in.
        It does not publish to Campfire, record a verified deed, or authenticate a person's identity.
      </div>
      <iframe
        title="First Circle — create, share, receive, decide and fork an offline world"
        src="./first-circle.html"
        className="min-h-0 w-full flex-1 border-0"
        allow="clipboard-write"
        id="first-circle-instrument"
      />
    </div>
  );
}
