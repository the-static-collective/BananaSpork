import { serializeFulfillmentEnvelopeV0 } from '../help-slip/envelope';
import type { FulfillmentRequirementV0, ImportedFulfillmentEnvelopeV0 } from '../help-slip/types';

/**
 * PENNY BOX is a candidate-producing doorway, not a source of shared authority.
 * This pure, offline adapter prepares an ordinary Help Slip for Garden's existing
 * preview -> device HOLD -> separate human POUR path. It does not sign, publish,
 * authenticate a person, record coins, or contact a network.
 */
export const PENNY_CANDIDATE_SCHEMA = 'penny-box-candidate/v0';
export const PENNY_SOURCE_LABEL = 'PENNY BOX (unverified candidate)';

export type PennyCandidateRefusal =
  | 'INVALID_JSON'
  | 'UNSUPPORTED_SCHEMA'
  | 'INVALID_SHAPE'
  | 'INVALID_FIELD'
  | 'INVALID_REQUIREMENT'
  | 'DUPLICATE_REQUIREMENT'
  | 'UNSUPPORTED_KIND'
  | 'NOT_A_CANDIDATE'
  | 'TOO_LARGE';

export type PennyCandidatePreparation =
  | { disposition: 'prepared'; carrier: string; payload: ImportedFulfillmentEnvelopeV0 }
  | { disposition: 'refused'; reason: PennyCandidateRefusal };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keysMatch(value: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key));
}

function textBound(value: unknown, maximum: number): value is string {
  return typeof value === 'string' &&
    value.trim() === value && value.length > 0 && value.length <= maximum &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function isoDate(value: unknown): value is string {
  return textBound(value, 40) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function token(value: unknown): value is string {
  return textBound(value, 64) && /^[A-Za-z0-9][A-Za-z0-9._:-]{2,63}$/.test(value);
}

const allowedKinds = new Set(['goods', 'equipment', 'transport', 'service']);

/**
 * Source preparation is NOT consent, authentication, or review. Garden must
 * show the exact payload and require human confirmation before a device HOLD.
 * Shared publication remains exclusively behind Garden's per-requirement POUR.
 */
export function preparePennyCandidate(raw: string): PennyCandidatePreparation {
  if (raw.length > 12000) return { disposition: 'refused', reason: 'TOO_LARGE' };
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { disposition: 'refused', reason: 'INVALID_JSON' };
  }
  if (!record(candidate)) return { disposition: 'refused', reason: 'INVALID_SHAPE' };
  if (candidate.schema !== PENNY_CANDIDATE_SCHEMA) {
    return { disposition: 'refused', reason: 'UNSUPPORTED_SCHEMA' };
  }
  if (!keysMatch(candidate,
    ['schema', 'signalId', 'createdAt', 'purpose', 'requirements', 'status'])) {
    return { disposition: 'refused', reason: 'INVALID_SHAPE' };
  }
  if (candidate.status !== 'candidate') {
    return { disposition: 'refused', reason: 'NOT_A_CANDIDATE' };
  }
  if (!token(candidate.signalId) || !isoDate(candidate.createdAt) ||
      !textBound(candidate.purpose, 180)) {
    return { disposition: 'refused', reason: 'INVALID_FIELD' };
  }
  if (!Array.isArray(candidate.requirements) || candidate.requirements.length < 1 ||
      candidate.requirements.length > 8) {
    return { disposition: 'refused', reason: 'INVALID_REQUIREMENT' };
  }

  const seen = new Set<string>();
  const requirements: FulfillmentRequirementV0[] = [];
  for (const item of candidate.requirements) {
    if (!record(item) ||
        !keysMatch(item, ['id', 'kind', 'description'], ['quantity', 'unit', 'neededBy']) ||
        !token(item.id) || !textBound(item.description, 160)) {
      return { disposition: 'refused', reason: 'INVALID_REQUIREMENT' };
    }
    if (!allowedKinds.has(String(item.kind))) {
      return { disposition: 'refused', reason: 'UNSUPPORTED_KIND' };
    }
    if (seen.has(item.id)) {
      return { disposition: 'refused', reason: 'DUPLICATE_REQUIREMENT' };
    }
    seen.add(item.id);
    if (item.quantity !== undefined &&
        (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) ||
         item.quantity <= 0 || item.quantity > 10000 || !textBound(item.unit, 32))) {
      return { disposition: 'refused', reason: 'INVALID_REQUIREMENT' };
    }
    if (item.quantity === undefined && item.unit !== undefined) {
      return { disposition: 'refused', reason: 'INVALID_REQUIREMENT' };
    }
    if (item.neededBy !== undefined && !isoDate(item.neededBy)) {
      return { disposition: 'refused', reason: 'INVALID_REQUIREMENT' };
    }
    requirements.push({
      id: item.id,
      kind: item.kind as string,
      description: item.description,
      ...(item.quantity === undefined ? {} : { quantity: item.quantity, unit: item.unit as string }),
      ...(item.neededBy === undefined ? {} : { neededBy: item.neededBy }),
    });
  }

  const payload: ImportedFulfillmentEnvelopeV0 = {
    schema: 'fulfillment-envelope/v0',
    envelopeId: 'penny-box:' + candidate.signalId,
    purpose: candidate.purpose,
    createdAt: candidate.createdAt,
    requirements,
    source: { system: PENNY_SOURCE_LABEL },
    disclosure: {
      includesOnlySelectedResiduals: true,
      omittedPrivateContext: true,
    },
    status: 'unmet',
  };
  return { disposition: 'prepared', carrier: serializeFulfillmentEnvelopeV0(payload), payload };
}
