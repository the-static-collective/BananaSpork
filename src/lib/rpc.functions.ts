import { supabase } from '../integrations/supabase/client';

export type RpcJson =
  | null
  | string
  | number
  | boolean
  | RpcJson[]
  | { [k: string]: RpcJson };

async function callRpc(fn: string, args: Record<string, unknown>): Promise<RpcJson> {
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as RpcJson;
}

// ---------- Profile ----------

export async function upsertProfile(displayName: string): Promise<RpcJson> {
  return callRpc('rpc_upsert_profile', { _display_name: displayName });
}

// ---------- Admin: household ----------

export async function createHouseholdAndCircle(data: {
  householdLabel: string;
  circleLabel: string;
  idempotencyKey: string;
}): Promise<RpcJson> {
  return callRpc('rpc_create_household_and_circle', {
    _household_label: data.householdLabel,
    _circle_label: data.circleLabel,
    _idempotency_key: data.idempotencyKey,
  });
}

// ---------- Admin: invitations ----------

export async function createInvitation(data: {
  circleId: string;
  idempotencyKey: string;
}): Promise<RpcJson> {
  return callRpc('rpc_create_invitation', {
    _circle_id: data.circleId,
    _idempotency_key: data.idempotencyKey,
  });
}

export async function redeemInvitation(rawToken: string): Promise<RpcJson> {
  return callRpc('rpc_redeem_invitation', { _raw_token: rawToken });
}

// ---------- Ledger commands ----------

export async function openNeed(data: {
  circleId: string;
  expectedHead: string;
  idempotencyKey: string;
  title: string;
  summary: string;
  requestedItems: string[];
  unitLabel: string;
  targetUnits: number;
  visibility: 'circle' | 'public_summary';
}): Promise<RpcJson> {
  return callRpc('rpc_open_need', {
    _circle_id: data.circleId,
    _expected_head: data.expectedHead,
    _idempotency_key: data.idempotencyKey,
    _title: data.title,
    _summary: data.summary,
    _requested_items: data.requestedItems,
    _unit_label: data.unitLabel,
    _target_units: data.targetUnits,
    _visibility: data.visibility,
  });
}

export async function pledgeOffer(data: {
  circleId: string;
  expectedHead: string;
  idempotencyKey: string;
  needId: string;
  kind: 'goods' | 'funds' | 'time' | 'creative_purchase';
  label: string;
  promisedUnits: number;
  note?: string | null;
}): Promise<RpcJson> {
  return callRpc('rpc_pledge_offer', {
    _circle_id: data.circleId,
    _expected_head: data.expectedHead,
    _idempotency_key: data.idempotencyKey,
    _need_id: data.needId,
    _kind: data.kind,
    _label: data.label,
    _promised_units: data.promisedUnits,
    _note: data.note ?? null,
  });
}

export async function acceptOffer(data: {
  circleId: string;
  expectedHead: string;
  idempotencyKey: string;
  offerId: string;
}): Promise<RpcJson> {
  return callRpc('rpc_accept_offer', {
    _circle_id: data.circleId,
    _expected_head: data.expectedHead,
    _idempotency_key: data.idempotencyKey,
    _offer_id: data.offerId,
  });
}

export async function declineOffer(data: {
  circleId: string;
  expectedHead: string;
  idempotencyKey: string;
  offerId: string;
  reason?: string | null;
}): Promise<RpcJson> {
  return callRpc('rpc_decline_offer', {
    _circle_id: data.circleId,
    _expected_head: data.expectedHead,
    _idempotency_key: data.idempotencyKey,
    _offer_id: data.offerId,
    _reason: data.reason ?? null,
  });
}

export async function reportFulfillment(data: {
  circleId: string;
  expectedHead: string;
  idempotencyKey: string;
  offerId: string;
  note?: string | null;
}): Promise<RpcJson> {
  return callRpc('rpc_report_fulfillment', {
    _circle_id: data.circleId,
    _expected_head: data.expectedHead,
    _idempotency_key: data.idempotencyKey,
    _offer_id: data.offerId,
    _note: data.note ?? null,
  });
}

export async function confirmFulfillment(data: {
  circleId: string;
  expectedHead: string;
  idempotencyKey: string;
  offerId: string;
  confirmedUnits: number;
}): Promise<RpcJson> {
  return callRpc('rpc_confirm_fulfillment', {
    _circle_id: data.circleId,
    _expected_head: data.expectedHead,
    _idempotency_key: data.idempotencyKey,
    _offer_id: data.offerId,
    _confirmed_units: data.confirmedUnits,
  });
}

export async function closeNeed(data: {
  circleId: string;
  expectedHead: string;
  idempotencyKey: string;
  needId: string;
  reason: string;
}): Promise<RpcJson> {
  return callRpc('rpc_close_need', {
    _circle_id: data.circleId,
    _expected_head: data.expectedHead,
    _idempotency_key: data.idempotencyKey,
    _need_id: data.needId,
    _reason: data.reason,
  });
}
