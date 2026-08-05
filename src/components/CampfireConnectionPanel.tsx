import React, { useState } from 'react';
import { Flame, LoaderCircle, LogIn, LogOut, ShieldCheck, WifiOff } from 'lucide-react';
import type { CampfireSessionController } from '../integrations/supabase/useCampfireSession';

interface CampfireConnectionPanelProps {
  connection: CampfireSessionController;
}

export const CampfireConnectionPanel: React.FC<CampfireConnectionPanelProps> = ({
  connection,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const runAuthAction = async (action: 'sign_in' | 'sign_up') => {
    if (!email.trim() || password.length < 6) return;
    setSubmitting(true);
    try {
      const succeeded =
        action === 'sign_in'
          ? await connection.signIn(email.trim(), password)
          : await connection.signUp(email.trim(), password);
      if (succeeded) setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  if (connection.status === 'not_configured') {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-amber-950">
        <div className="flex items-start gap-3">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
          <div>
            <p className="text-xs font-extrabold">This-device Garden</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
              Shared Campfire is not configured in this build. Device-local proposals remain
              available and cannot masquerade as shared history.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (
    connection.status === 'checking_session' ||
    connection.status === 'loading_memberships'
  ) {
    return (
      <section
        className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-xs font-bold text-amber-900"
        aria-live="polite"
      >
        <LoaderCircle className="h-4 w-4 animate-spin text-amber-700" />
        {connection.status === 'checking_session'
          ? 'Checking the saved Campfire session…'
          : 'Loading accessible Campfires…'}
      </section>
    );
  }

  if (connection.status === 'signed_out' || (connection.status === 'error' && !connection.session)) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-start gap-3">
          <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
          <div>
            <p className="text-xs font-extrabold text-amber-950">Enter a shared Campfire</p>
            <p className="mt-0.5 text-[11px] text-amber-800">
              Signing in restores only circles this account is authorized to read.
            </p>
          </div>
        </div>
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void runAuthAction('sign_in');
          }}
        >
          <label className="sr-only" htmlFor="campfire-email">Email</label>
          <input
            id="campfire-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="min-h-[44px] rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <label className="sr-only" htmlFor="campfire-password">Password</label>
          <input
            id="campfire-password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="min-h-[44px] rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim() || password.length < 6}
            className="min-h-[44px] rounded-xl bg-amber-900 px-4 text-xs font-extrabold text-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={submitting || !email.trim() || password.length < 6}
            onClick={() => void runAuthAction('sign_up')}
            className="text-[11px] font-bold text-amber-800 underline disabled:opacity-50"
          >
            Create an account
          </button>
          {connection.message && (
            <p className="text-right text-[11px] font-semibold text-red-700" role="alert">
              {connection.message}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (connection.status === 'no_membership') {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Flame className="mt-0.5 h-4 w-4 text-amber-800" />
            <div>
              <p className="text-xs font-extrabold text-amber-950">Signed in; no Campfire yet</p>
              <p className="mt-0.5 text-[11px] text-amber-800">
                This account needs a household invitation or a newly created circle before shared
                actions can appear.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void connection.signOut()}
            className="shrink-0 text-[11px] font-bold text-amber-900 underline"
          >
            Sign out
          </button>
        </div>
      </section>
    );
  }

  if (connection.activeMembership) {
    return (
      <section className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <p className="text-xs font-extrabold text-emerald-950">Shared Campfire connected</p>
              <p className="mt-0.5 text-[11px] text-emerald-800">
                {connection.activeMembership.household_label || 'Household'} ·{' '}
                {connection.activeMembership.role} role
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connection.memberships.length > 1 && (
              <label className="flex items-center gap-2 text-[11px] font-bold text-emerald-900">
                <span className="sr-only">Active Campfire</span>
                <select
                  value={connection.activeCircleId}
                  onChange={(event) => connection.selectCircle(event.target.value)}
                  className="min-h-[40px] rounded-xl border border-emerald-300 bg-white px-3"
                >
                  {connection.memberships.map((membership) => (
                    <option key={membership.circle_id} value={membership.circle_id}>
                      {membership.circle_label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => void connection.signOut()}
              className="flex min-h-[40px] items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 text-[11px] font-bold text-emerald-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
        {connection.message && (
          <p className="mt-2 text-[11px] font-semibold text-red-700" role="alert">
            {connection.message}
          </p>
        )}
      </section>
    );
  }

  return null;
};
