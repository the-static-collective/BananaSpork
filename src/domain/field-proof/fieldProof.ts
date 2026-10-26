/**
 * FIELD-SPECIMEN-002 · operator-side evidence assessment.
 *
 * Unlike real BananaSpork Campfire receipts, this is an unauthenticated local
 * inspection of a human-entered trial log. It NEVER certifies RLS, identities,
 * physical delivery, or independent witness. The host project remains the owner.
 */
export const FIELD_SCHEMA = 'bananaspork.field-trial-observation/v0';
export const REPORT_SCHEMA = 'bananaspork.field-trial-review/v0';

export const FIELD_CHECKS = [
  'intentionally_selected_bananaspork_project',
  'conversation_migration_verified_on_target',
  'independent_a_authenticated',
  'independent_b_authenticated',
  'independent_c_nonmember_authenticated',
  'member_a_sent',
  'member_b_received',
  'sender_identity_derived_from_auth',
  'nonmember_select_refused',
  'nonmember_insert_refused',
  'restart_rehydrated_shared_messages',
  'duplicate_envelope_one_held_need',
  'requirement_poured_with_user_selection',
  'helper_report_did_not_confirm',
  'recipient_partially_confirmed',
  'source_envelope_unchanged',
  'unresolved_need_preserved',
] as const;
export type FieldCheck = typeof FIELD_CHECKS[number];
export type FieldObservationStatus = 'observed' | 'failed' | 'not-run';
export type FieldChecklist = Record<FieldCheck, FieldObservationStatus>;

export interface LocalFieldTrial {
  schema: typeof FIELD_SCHEMA;
  targetProjectRef: string;
  operatorReviewed: boolean;
  synthetic: boolean;
  checks: FieldChecklist;
  specimen: {
    requestedUnits: number;
    helperReportedUnits: number;
    recipientConfirmedUnits: number;
    residualBeforeReport: number;
    residualAfterReport: number;
    residualAfterConfirmation: number;
    heldDemandIds: [string, string];
    arrivalIds: [string, string];
    sourceHashBefore: string;
    sourceHashAfter: string;
    claimedOccurrenceRefs: string[];
  };
}

export interface FieldReview {
  schema: typeof REPORT_SCHEMA;
  standing: 'NOT_STARTED' | 'INCOMPLETE' | 'BLOCKED' | 'SYNTHETIC_EXERCISE' | 'OPERATOR_REPORTED_READY_FOR_REVIEW';
  targetProjectRef: string;
  missing: FieldCheck[];
  failures: string[];
  observedSteps: number;
  requiredSteps: number;
  operatorReviewed: boolean;
  synthetic: boolean;
  independentlyVerified: false;
  physicalProvisionVerified: false;
  sourceOwnerAccepted: false;
  authority: 'none';
  nextGate: string;
}

const PROJECT_REF = /^[a-z0-9]{20}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE = /^[a-zA-Z0-9:_-]{6,100}$/;
function finiteNonnegative(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('INVALID_NONNEGATIVE_QUANTITY:' + label);
  }
  return value;
}
function near(a: number, b: number) {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}
/**
 * A checklist entry is an observer's assertion, never actual evidence of a
 * logged-in account or a human's action. No sample mode may be called verified.
 */
export function assessFieldTrial(input: LocalFieldTrial): FieldReview {
  if (!input || input.schema !== FIELD_SCHEMA) throw new Error('FIELD_SCHEMA_REQUIRED');
  if (!PROJECT_REF.test(input.targetProjectRef)) throw new Error('EXPLICIT_PROJECT_REQUIRED');
  if (!input.checks || typeof input.checks !== 'object') throw new Error('CHECKS_REQUIRED');
  const failed: string[] = [];
  const missing: FieldCheck[] = [];
  let observed = 0;
  for (const check of FIELD_CHECKS) {
    const state = input.checks[check];
    if (state === 'observed') observed++;
    else if (state === 'failed') failed.push('CHECK_FAILED:' + check);
    else if (state === 'not-run') missing.push(check);
    else throw new Error('INVALID_CHECK_STATE:' + check);
  }
  if (Object.keys(input.checks).some(k => !(FIELD_CHECKS as readonly string[]).includes(k))) {
    throw new Error('UNKNOWN_CHECK');
  }
  const q = input.specimen;
  if (!q) throw new Error('SPECIMEN_REQUIRED');
  const values = [
    'requestedUnits', 'helperReportedUnits', 'recipientConfirmedUnits',
    'residualBeforeReport', 'residualAfterReport', 'residualAfterConfirmation'
  ] as const;
  for (const key of values) finiteNonnegative(q[key], key);
  if (q.requestedUnits <= 0) failed.push('NONZERO_SAMPLE_REQUIRED');
  if (q.recipientConfirmedUnits > q.requestedUnits) failed.push('OVERCONFIRMATION');
  if (!near(q.residualBeforeReport, q.requestedUnits)) failed.push('BASELINE_RESIDUAL_INCONSISTENT');
  if (!near(q.residualAfterReport, q.residualBeforeReport)) failed.push('REPORT_REDUCED_RESIDUAL');
  if (!near(q.residualAfterConfirmation, Math.max(0, q.requestedUnits - q.recipientConfirmedUnits))) {
    failed.push('CONFIRMATION_RESIDUAL_INCONSISTENT');
  }
  if (!Array.isArray(q.heldDemandIds) || q.heldDemandIds.length !== 2 ||
    !q.heldDemandIds.every(v => typeof v === 'string' && OPAQUE.test(v)) ||
    q.heldDemandIds[0] !== q.heldDemandIds[1]) failed.push('DUPLICATE_CREATED_NEW_DEMAND');
  if (!Array.isArray(q.arrivalIds) || q.arrivalIds.length !== 2 ||
    !q.arrivalIds.every(v => typeof v === 'string' && OPAQUE.test(v)) ||
    q.arrivalIds[0] === q.arrivalIds[1]) failed.push('ARRIVAL_OCCURRENCES_NOT_DISTINCT');
  if (!SHA256.test(q.sourceHashBefore) || !SHA256.test(q.sourceHashAfter) ||
    q.sourceHashBefore !== q.sourceHashAfter) failed.push('SOURCE_ENVELOPE_REWRITTEN_OR_UNPROVEN');
  if (!Array.isArray(q.claimedOccurrenceRefs) || q.claimedOccurrenceRefs.length > 20 ||
    q.claimedOccurrenceRefs.some(v => typeof v !== 'string' || !OPAQUE.test(v))) {
    failed.push('INVALID_CLAIMED_OCCURRENCE_REFS');
  }
  // Two database IDs do not establish two distinct physical deliveries.
  // Deliberately never classify occurrence refs as verified evidence.
  const standing: FieldReview['standing'] =
    failed.length ? 'BLOCKED' :
    input.synthetic ? 'SYNTHETIC_EXERCISE' :
    observed === 0 ? 'NOT_STARTED' :
    missing.length || !input.operatorReviewed ? 'INCOMPLETE' :
    'OPERATOR_REPORTED_READY_FOR_REVIEW';
  return {
    schema: REPORT_SCHEMA, standing, targetProjectRef: input.targetProjectRef,
    missing, failures: failed, observedSteps: observed, requiredSteps: FIELD_CHECKS.length,
    operatorReviewed: input.operatorReviewed === true, synthetic: input.synthetic === true,
    independentlyVerified: false, physicalProvisionVerified: false,
    sourceOwnerAccepted: false, authority: 'none',
    nextGate: 'An independent reviewer must inspect authenticated source-side logs, member isolation, actual recipient confirmation and lawful custody before any verified Jubilee / Free Graph result.',
  };
}
