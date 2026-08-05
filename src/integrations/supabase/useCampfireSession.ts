import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { JubileeCurrentUser } from '../../domain/jubilee/contracts';
import { fetchMyMemberships, type Membership } from '../../lib/circle';
import { supabase } from './client';
import { supabasePublicConfig } from './config';

const ACTIVE_CIRCLE_STORAGE_PREFIX = 'bananagram_active_circle_v1';

export type CampfireConnectionStatus =
  | 'not_configured'
  | 'checking_session'
  | 'signed_out'
  | 'loading_memberships'
  | 'ready'
  | 'no_membership'
  | 'error';

function activeCircleStorageKey(userId: string): string {
  return `${ACTIVE_CIRCLE_STORAGE_PREFIX}:${userId}`;
}

function displayNameForSession(session: Session): string {
  const email = session.user.email?.trim();
  return email ? email.split('@')[0] : 'Campfire Member';
}

export function useCampfireSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<CampfireConnectionStatus>(
    supabasePublicConfig.configured ? 'checking_session' : 'not_configured'
  );
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeCircleId, setActiveCircleId] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!supabasePublicConfig.configured) return;

    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMessage(error.message);
        setStatus('error');
        return;
      }
      setSession(data.session);
      setStatus(data.session ? 'loading_memberships' : 'signed_out');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setMessage(undefined);
      setStatus(nextSession ? 'loading_memberships' : 'signed_out');
      if (!nextSession) {
        setMemberships([]);
        setActiveCircleId(undefined);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !supabasePublicConfig.configured) return;

    let active = true;
    setStatus('loading_memberships');

    void fetchMyMemberships(userId)
      .then((nextMemberships) => {
        if (!active) return;
        setMemberships(nextMemberships);

        if (nextMemberships.length === 0) {
          setActiveCircleId(undefined);
          setStatus('no_membership');
          return;
        }

        let savedCircleId: string | null = null;
        try {
          savedCircleId = localStorage.getItem(activeCircleStorageKey(userId));
        } catch {
          // Storage is optional; first accessible membership remains deterministic.
        }

        const selected =
          nextMemberships.find((membership) => membership.circle_id === savedCircleId) ??
          nextMemberships[0];
        setActiveCircleId(selected.circle_id);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMemberships([]);
        setActiveCircleId(undefined);
        setMessage(error instanceof Error ? error.message : 'Could not load Campfire memberships.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.circle_id === activeCircleId),
    [activeCircleId, memberships]
  );

  const currentUser = useMemo<JubileeCurrentUser | undefined>(() => {
    if (!session || !activeMembership) return undefined;
    return {
      id: session.user.id,
      name: displayNameForSession(session),
      role: activeMembership.role,
    };
  }, [activeMembership, session]);

  const selectCircle = useCallback(
    (circleId: string) => {
      if (!session || !memberships.some((membership) => membership.circle_id === circleId)) {
        setMessage('That Campfire is not available to this signed-in account.');
        return;
      }
      setActiveCircleId(circleId);
      setStatus('ready');
      setMessage(undefined);
      try {
        localStorage.setItem(activeCircleStorageKey(session.user.id), circleId);
      } catch {
        // Selection remains valid for this session even if persistence is unavailable.
      }
    },
    [memberships, session]
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setMessage(undefined);
    setStatus('checking_session');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setStatus('signed_out');
      return false;
    }
    return true;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setMessage(undefined);
    setStatus('checking_session');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      setStatus('signed_out');
      return false;
    }
    if (!data.session) {
      setMessage('Account created. Check your email to confirm it, then sign in.');
      setStatus('signed_out');
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    setMessage(undefined);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
      setStatus('error');
      return false;
    }
    return true;
  }, []);

  return {
    configured: supabasePublicConfig.configured,
    configurationIssue: supabasePublicConfig.issue,
    status,
    session,
    memberships,
    activeMembership,
    activeCircleId,
    currentUser,
    message,
    selectCircle,
    signIn,
    signUp,
    signOut,
  };
}

export type CampfireSessionController = ReturnType<typeof useCampfireSession>;
