import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceTrial, allGatesMet, DEMO_WORK_ORDERS, PARTNER_LEADS,
  setTrialGate, trialCounts, type TrialWorkOrder,
} from './pilot';

const instant = '2026-10-27T10:00:00.000Z';
const operator = { id: 'operator-001', role: 'operator' as const };
const helper = { id: 'volunteer-002', role: 'volunteer' as const };
const receiver = { id: 'receiver-003', role: 'receiver' as const };

function fresh(): TrialWorkOrder {
  const item = DEMO_WORK_ORDERS[0];
  return { ...item, gates: { ...item.gates }, receipts: [] };
}

function approvedFixture(): TrialWorkOrder {
  let item = fresh();
  item = setTrialGate(item, 'operatorAccepted', true);
  item = setTrialGate(item, 'safeguardingApproved', true);
  item = setTrialGate(item, 'consentConfirmed', true);
  item = setTrialGate(item, 'privacyApproved', true);
  return advanceTrial(item, 'APPROVE', operator, instant);
}

test('public lead research does not claim outreach or partnership', () => {
  assert.equal(PARTNER_LEADS.length, 3);
  assert.ok(PARTNER_LEADS.every((lead) =>
    lead.status === 'RESEARCHED_NOT_CONTACTED' &&
    lead.publicUrl.startsWith('https://') &&
    lead.contact.includes('@') &&
    lead.invitationBody.includes('[Your name / contact]')
  ));
});

test('a synthetic work order starts on HOLD, with no actual authorization', () => {
  const work = fresh();
  assert.equal(work.status, 'HOLD');
  assert.equal(allGatesMet(work.gates), false);
  assert.throws(() => advanceTrial(work, 'APPROVE', operator, instant), /TRANSITION_REFUSED/);
  assert.throws(() => advanceTrial(work, 'REPORT', helper, instant), /TRANSITION_REFUSED/);
});

test('all approval gates must be separately met; only operator approves', () => {
  let work = fresh();
  for (const gate of ['operatorAccepted', 'safeguardingApproved', 'privacyApproved'] as const) {
    work = setTrialGate(work, gate, true);
  }
  assert.throws(() => advanceTrial(work, 'APPROVE', operator, instant), /TRANSITION_REFUSED/);
  work = setTrialGate(work, 'consentConfirmed', true);
  assert.throws(() => advanceTrial(work, 'APPROVE', helper, instant), /TRANSITION_REFUSED/);
  const next = advanceTrial(work, 'APPROVE', operator, instant);
  assert.equal(next.status, 'APPROVED');
  assert.equal(work.status, 'HOLD', 'original object not mutated');
  assert.equal(next.receipts[0].provenance, 'SYNTHETIC_DEMO_ONLY');
  assert.throws(() => setTrialGate(next, 'privacyApproved', false), /GATES_LOCKED/);
});

test('volunteer report is never counted as receiver-confirmed', () => {
  const approved = approvedFixture();
  const reported = advanceTrial(approved, 'REPORT', helper, instant);
  assert.equal(reported.status, 'REPORTED');
  assert.deepEqual(trialCounts([reported]), { reported: 1, confirmed: 0, refused: 0 });
  assert.throws(() => advanceTrial(reported, 'CONFIRM', operator, instant), /TRANSITION_REFUSED/);
  assert.throws(() => advanceTrial(reported, 'CONFIRM', { id: helper.id, role: 'receiver' }, instant), /TRANSITION_REFUSED/);
  const confirmed = advanceTrial(reported, 'CONFIRM', receiver, instant);
  assert.equal(confirmed.status, 'CONFIRMED');
  assert.equal(confirmed.receipts.length, 3);
  assert.deepEqual(trialCounts([confirmed]), { reported: 0, confirmed: 1, refused: 0 });
  assert.throws(() => advanceTrial(confirmed, 'CONFIRM', receiver, instant), /TRANSITION_REFUSED/);
});

test('local operator can refuse pending task; refusal cannot be self-overridden', () => {
  const refused = advanceTrial(approvedFixture(), 'REFUSE', operator, instant);
  assert.equal(refused.status, 'REFUSED');
  assert.throws(() => advanceTrial(refused, 'REPORT', helper, instant), /TRANSITION_REFUSED/);
});

test('non-fixture or malformed identifiers fail closed', () => {
  const work = approvedFixture();
  assert.throws(() => advanceTrial({ ...work, fixture: false as true }, 'REPORT', helper, instant), /SYNTHETIC_ONLY/);
  assert.throws(() => advanceTrial({ ...work, id: 'person-real-address' }, 'REPORT', helper, instant), /SYNTHETIC_ONLY/);
  assert.throws(() => advanceTrial(work, 'REPORT', { ...helper, id: '' }, instant), /SYNTHETIC_ONLY/);
  assert.throws(() => advanceTrial(work, 'REPORT', helper, 'nonsense'), /SYNTHETIC_ONLY/);
});
