import { supabase } from '../integrations/supabase/client';
import type { EventRow } from '../domain/events';

export type Membership = {
  circle_id: string;
  role: 'household' | 'neighbor' | 'steward';
  circle_label: string;
  household_id: string;
  household_label: string;
};

export async function fetchMyMemberships(userId: string): Promise<Membership[]> {
  const { data: mems, error: e1 } = await supabase
    .from('circle_memberships')
    .select('circle_id, role')
    .eq('user_id', userId);
  if (e1) throw e1;
  if (!mems || mems.length === 0) return [];

  const circleIds = mems.map((m) => m.circle_id);
  const { data: circles, error: e2 } = await supabase
    .from('circles')
    .select('id, label, household_id')
    .in('id', circleIds);
  if (e2) throw e2;

  const hhIds = Array.from(new Set((circles ?? []).map((c) => c.household_id)));
  const { data: hhs, error: e3 } = await supabase
    .from('households')
    .select('id, label')
    .in('id', hhIds.length > 0 ? hhIds : ['00000000-0000-0000-0000-000000000000']);
  if (e3) throw e3;

  const cById = new Map((circles ?? []).map((c) => [c.id, c] as const));
  const hById = new Map((hhs ?? []).map((h) => [h.id, h] as const));

  return mems
    .map((m) => {
      const c = cById.get(m.circle_id);
      if (!c) return null;
      const h = hById.get(c.household_id);
      return {
        circle_id: m.circle_id,
        role: m.role as Membership['role'],
        circle_label: c.label,
        household_id: c.household_id,
        household_label: h?.label ?? '',
      };
    })
    .filter((x): x is Membership => x !== null);
}

export async function fetchCircleEvents(circleId: string): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('witness_events')
    .select('*')
    .eq('circle_id', circleId)
    .order('sequence', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function fetchCircleHead(circleId: string): Promise<{ head_hash: string; sequence: number }> {
  const { data, error } = await supabase
    .from('ledger_heads')
    .select('head_hash, sequence')
    .eq('circle_id', circleId)
    .single();
  if (error) throw error;
  return data;
}

// ---------- Projection: needs + offers ----------

export type NeedProjection = {
  needId: string;
  householdId: string;
  householdLabel: string;
  title: string;
  summary: string;
  requestedItems: string[];
  unitLabel: string;
  targetUnits: number;
  confirmedUnits: number;
  status: 'open' | 'fulfilled' | 'closed';
  visibility: 'circle' | 'public_summary';
  createdAt: string;
  offers: OfferProjection[];
};

export type OfferProjection = {
  offerId: string;
  needId: string;
  contributorId: string;
  contributorLabel: string;
  contributorRole: string;
  kind: string;
  label: string;
  promisedUnits: number;
  confirmedUnits: number;
  note?: string;
  status: 'pledged' | 'accepted' | 'declined' | 'reported' | 'confirmed';
  reportedAt?: string;
  confirmedAt?: string;
};

export function projectNeeds(events: EventRow[]): NeedProjection[] {
  const needs = new Map<string, NeedProjection>();
  const offers = new Map<string, OfferProjection>();
  for (const e of events) {
    const p = e.payload as Record<string, any>;
    switch (e.kind) {
      case 'need.opened':
        needs.set(e.aggregate_id, {
          needId: e.aggregate_id,
          householdId: p.householdId,
          householdLabel: p.householdLabel,
          title: p.title,
          summary: p.summary,
          requestedItems: p.requestedItems ?? [],
          unitLabel: p.unitLabel,
          targetUnits: p.targetUnits,
          confirmedUnits: 0,
          status: 'open',
          visibility: p.visibility,
          createdAt: e.occurred_at_text,
          offers: [],
        });
        break;
      case 'need.closed': {
        const n = needs.get(e.aggregate_id);
        if (n) {
          // Closing a fully confirmed need records finality; it does not turn a
          // completed harvest into compost.
          n.status = n.confirmedUnits >= n.targetUnits ? 'fulfilled' : 'closed';
        }
        break;
      }
      case 'offer.pledged':
        offers.set(e.aggregate_id, {
          offerId: e.aggregate_id,
          needId: p.needId,
          contributorId: p.contributorId,
          contributorLabel: p.contributorLabel,
          contributorRole: p.contributorRole,
          kind: p.kind,
          label: p.label,
          promisedUnits: p.promisedUnits,
          confirmedUnits: 0,
          note: p.note,
          status: 'pledged',
        });
        break;
      case 'offer.accepted': {
        const o = offers.get(e.aggregate_id);
        if (o) o.status = 'accepted';
        break;
      }
      case 'offer.declined': {
        const o = offers.get(e.aggregate_id);
        if (o) o.status = 'declined';
        break;
      }
      case 'fulfillment.reported': {
        const o = offers.get(e.aggregate_id);
        if (o) {
          o.status = 'reported';
          o.reportedAt = e.occurred_at_text;
        }
        break;
      }
      case 'fulfillment.confirmed': {
        const o = offers.get(e.aggregate_id);
        if (o) {
          o.status = 'confirmed';
          o.confirmedUnits = p.confirmedUnits;
          o.confirmedAt = e.occurred_at_text;
          const n = needs.get(o.needId);
          if (n) {
            n.confirmedUnits += p.confirmedUnits;
            if (n.confirmedUnits >= n.targetUnits) n.status = 'fulfilled';
          }
        }
        break;
      }
    }
  }
  // Attach offers to needs
  for (const o of offers.values()) {
    const n = needs.get(o.needId);
    if (n) n.offers.push(o);
  }
  return Array.from(needs.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
