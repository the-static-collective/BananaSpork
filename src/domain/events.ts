import { canonicalJson, type CanonicalValue } from './canonical';
import { sha256Hex } from './hashes';

export type EventRow = {
  event_id: string;
  circle_id: string;
  sequence: number;
  kind: string;
  occurred_at: string;
  occurred_at_text: string;
  actor_user_id: string;
  actor_label: string;
  actor_role: string;
  aggregate_id: string;
  payload: Record<string, CanonicalValue>;
  previous_hash: string;
  event_hash: string;
};

// Reconstruct the exact envelope the server hashed in SQL bananagram_core.append_event.
export function envelopeFor(e: EventRow): CanonicalValue {
  return {
    schema: 'bananagram.witness-event/v1',
    eventId: e.event_id,
    sequence: e.sequence,
    kind: e.kind,
    occurredAt: e.occurred_at_text,
    actor: { id: e.actor_user_id, label: e.actor_label, role: e.actor_role },
    aggregateId: e.aggregate_id,
    payload: e.payload,
    previousHash: e.previous_hash,
  };
}

export function computeEventHash(e: EventRow): string {
  return sha256Hex(canonicalJson(envelopeFor(e)));
}

// Recompute the whole chain; returns [ok, firstBadSequence].
export function verifyChain(events: EventRow[]): { ok: true } | { ok: false; badSequence: number; reason: string } {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  let prev = 'GENESIS';
  for (const e of sorted) {
    if (e.previous_hash !== prev) {
      return { ok: false, badSequence: e.sequence, reason: 'previous_hash_mismatch' };
    }
    const h = computeEventHash(e);
    if (h !== e.event_hash) {
      return { ok: false, badSequence: e.sequence, reason: 'event_hash_mismatch' };
    }
    prev = h;
  }
  return { ok: true };
}
