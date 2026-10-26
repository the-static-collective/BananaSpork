import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_CHECKS, FIELD_SCHEMA, assessFieldTrial,
  type LocalFieldTrial,
} from './fieldProof';

function fixture(): LocalFieldTrial {
  return {
    schema: FIELD_SCHEMA,
    targetProjectRef: 'a'.repeat(20),
    synthetic: true,
    operatorReviewed: true,
    checks: Object.fromEntries(FIELD_CHECKS.map(k => [k, 'observed'])) as LocalFieldTrial['checks'],
    specimen: {
      requestedUnits: 24,
      helperReportedUnits: 14,
      recipientConfirmedUnits: 6,
      residualBeforeReport: 24,
      residualAfterReport: 24,
      residualAfterConfirmation: 18,
      heldDemandIds: ['held:fixture-001', 'held:fixture-001'],
      arrivalIds: ['arrival:fixture-001', 'arrival:fixture-002'],
      sourceHashBefore: 'b'.repeat(64),
      sourceHashAfter: 'b'.repeat(64),
      claimedOccurrenceRefs: ['occurrence:fixture-001'],
    },
  };
}

test('even complete operator assertions never become verified world evidence', () => {
  const review = assessFieldTrial(fixture());
  assert.equal(review.standing, 'SYNTHETIC_EXERCISE');
  assert.equal(review.observedSteps, FIELD_CHECKS.length);
  assert.equal(review.independentlyVerified, false);
  assert.equal(review.physicalProvisionVerified, false);
  assert.equal(review.sourceOwnerAccepted, false);
  assert.equal(review.authority, 'none');
  assert.equal(review.synthetic, true);
});

test('unrun or unreviewed field checks cannot be promoted', () => {
  const a = fixture();
  a.synthetic = false;
  a.checks.nonmember_select_refused = 'not-run';
  const result = assessFieldTrial(a);
  assert.equal(result.standing, 'INCOMPLETE');
  assert.deepEqual(result.missing, ['nonmember_select_refused']);
  const b = fixture();
  b.synthetic = false;
  b.operatorReviewed = false;
  assert.equal(assessFieldTrial(b).standing, 'INCOMPLETE');
  const c = fixture();
  c.synthetic = false;
  for (const key of FIELD_CHECKS) c.checks[key] = 'not-run';
  assert.equal(assessFieldTrial(c).standing, 'NOT_STARTED');
});

test('a hostile nonmember gaining access blocks the trial regardless of other results', () => {
  const a = fixture();
  a.checks.nonmember_insert_refused = 'failed';
  const result = assessFieldTrial(a);
  assert.equal(result.standing, 'BLOCKED');
  assert.ok(result.failures.includes('CHECK_FAILED:nonmember_insert_refused'));
});

test('helper report alone may not reduce the residual', () => {
  const a = fixture();
  a.specimen.residualAfterReport = 10;
  const result = assessFieldTrial(a);
  assert.equal(result.standing, 'BLOCKED');
  assert.ok(result.failures.includes('REPORT_REDUCED_RESIDUAL'));
});

test('only a distinct, partially confirmed quantity can lower residual in source claim', () => {
  const a = fixture();
  a.specimen.residualAfterConfirmation = 10;
  assert.ok(assessFieldTrial(a).failures.includes('CONFIRMATION_RESIDUAL_INCONSISTENT'));
  const b = fixture();
  b.specimen.recipientConfirmedUnits = 25;
  assert.ok(assessFieldTrial(b).failures.includes('OVERCONFIRMATION'));
});

test('duplicate import yields one held demand, two separate arrival occurrence records', () => {
  const a = fixture();
  a.specimen.heldDemandIds = ['held:fixture-001', 'held:fixture-002'];
  assert.ok(assessFieldTrial(a).failures.includes('DUPLICATE_CREATED_NEW_DEMAND'));
  const b = fixture();
  b.specimen.arrivalIds = ['arrival:fixture-001', 'arrival:fixture-001'];
  assert.ok(assessFieldTrial(b).failures.includes('ARRIVAL_OCCURRENCES_NOT_DISTINCT'));
});

test('source envelope must survive the return unchanged', () => {
  const a = fixture();
  a.specimen.sourceHashAfter = 'c'.repeat(64);
  assert.ok(assessFieldTrial(a).failures.includes('SOURCE_ENVELOPE_REWRITTEN_OR_UNPROVEN'));
  const b = fixture();
  b.specimen.sourceHashBefore = 'not-a-sha';
  assert.ok(assessFieldTrial(b).failures.includes('SOURCE_ENVELOPE_REWRITTEN_OR_UNPROVEN'));
});

test('physical occurrence IDs are only claimed references; cannot independently verify delivery', () => {
  const a = fixture();
  a.specimen.claimedOccurrenceRefs = ['occurrence:001', 'occurrence:002'];
  const result = assessFieldTrial(a);
  assert.equal(result.physicalProvisionVerified, false);
  assert.equal(result.independentlyVerified, false);
});

test('refuse invented field check names, invalid roles, project-less records or negative values', () => {
  const a = fixture();
  (a.checks as unknown as Record<string, string>).verified_by_banana_ai = 'observed';
  assert.throws(() => assessFieldTrial(a), /UNKNOWN_CHECK/);
  const b = fixture();
  b.targetProjectRef = 'pantry-gate';
  assert.throws(() => assessFieldTrial(b), /EXPLICIT_PROJECT_REQUIRED/);
  const c = fixture();
  c.specimen.helperReportedUnits = -1;
  assert.throws(() => assessFieldTrial(c), /INVALID_NONNEGATIVE_QUANTITY/);
  const d = fixture();
  (d.checks as Record<string, string>).member_a_sent = 'auto-verified';
  assert.throws(() => assessFieldTrial(d), /INVALID_CHECK_STATE/);
});

test('even complete real-world assertions remain operator-reported pending independent review', () => {
  const a = fixture();
  a.synthetic = false;
  const result = assessFieldTrial(a);
  assert.equal(result.standing, 'OPERATOR_REPORTED_READY_FOR_REVIEW');
  assert.equal(result.sourceOwnerAccepted, false);
  assert.equal(result.physicalProvisionVerified, false);
});
