import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admitHelpSlipCarrier } from '../help-slip/envelope';
import { HelpSlipHoldStore, type HelpSlipStorage } from '../help-slip/holdStore';
import { preparePennyCandidate, PENNY_SOURCE_LABEL } from './pennyHelpSlip';

class MemoryStorage implements HelpSlipStorage {
  private items = new Map<string, string>();
  getItem(key: string): string | null { return this.items.get(key) ?? null; }
  setItem(key: string, value: string): void { this.items.set(key, value); }
  removeItem(key: string): void { this.items.delete(key); }
}

const base = {
  schema: 'penny-box-candidate/v0',
  signalId: 'garden-demo-001',
  createdAt: '2026-10-19T21:00:00.000Z',
  purpose: 'Help a neighbor obtain supplies',
  status: 'candidate',
  requirements: [
    { id: 'dry-beans-001', kind: 'goods', description: 'Dry beans', quantity: 2, unit: 'bag' },
    { id: 'ride-001', kind: 'transport', description: 'One volunteer ride' },
  ],
};

test('PENNY candidate prepares exact ordinary Help Slip without publishing', () => {
  const prep = preparePennyCandidate(JSON.stringify(base));
  assert.equal(prep.disposition, 'prepared');
  if (prep.disposition !== 'prepared') return;
  assert.equal(prep.payload.source.system, PENNY_SOURCE_LABEL);
  assert.equal(prep.payload.envelopeId, 'penny-box:garden-demo-001');
  assert.equal(prep.payload.requirements[0].unit, 'bag');
  const admission = admitHelpSlipCarrier(prep.carrier);
  assert.equal(admission.disposition, 'admitted');
  if (admission.disposition !== 'admitted') return;
  assert.deepEqual(admission.payload, prep.payload);
  assert.equal(admission.payloadHash.length, 64);
});

test('PENNY candidate whitespace and field order do not duplicate local demand', () => {
  const rawA = JSON.stringify(base);
  const rawB = JSON.stringify({
    requirements: base.requirements,
    status: base.status,
    purpose: base.purpose,
    createdAt: base.createdAt,
    signalId: base.signalId,
    schema: base.schema,
  }, null, 2);
  const a = preparePennyCandidate(rawA);
  const b = preparePennyCandidate(rawB);
  assert.equal(a.disposition, 'prepared');
  assert.equal(b.disposition, 'prepared');
  if (a.disposition !== 'prepared' || b.disposition !== 'prepared') return;
  assert.equal(a.carrier, b.carrier);
  const store = new HelpSlipHoldStore(new MemoryStorage());
  const first = store.holdImportedHelpSlip(a.carrier, {
    occurrenceId: 'arrival-penny-1', receivedAt: base.createdAt,
  });
  const second = store.holdImportedHelpSlip(b.carrier, {
    occurrenceId: 'arrival-penny-2', receivedAt: base.createdAt,
  });
  assert.equal(first.disposition, 'held');
  assert.equal(second.disposition, 'held');
  if (first.disposition !== 'held' || second.disposition !== 'held') return;
  assert.equal(first.caseCreated, true);
  assert.equal(second.caseCreated, false);
  assert.equal(second.heldCase.arrivals.length, 2);
  assert.equal(store.listHeldHelpCases().length, 1);
  assert.equal(store.listHeldHelpCases()[0].requirementLinks.length, 0);
});

test('same PENNY signal id with mutated need is refused instead of double-counted', () => {
  const store = new HelpSlipHoldStore(new MemoryStorage());
  const original = preparePennyCandidate(JSON.stringify(base));
  const changed = preparePennyCandidate(JSON.stringify({
    ...base,
    requirements: [{ ...base.requirements[0], quantity: 3 }],
  }));
  assert.equal(original.disposition, 'prepared');
  assert.equal(changed.disposition, 'prepared');
  if (original.disposition !== 'prepared' || changed.disposition !== 'prepared') return;
  store.holdImportedHelpSlip(original.carrier, {
    occurrenceId: 'arrival-original', receivedAt: base.createdAt,
  });
  const conflict = store.holdImportedHelpSlip(changed.carrier, {
    occurrenceId: 'arrival-revised', receivedAt: base.createdAt,
  });
  assert.equal(conflict.disposition, 'refused');
  if (conflict.disposition === 'refused') {
    assert.equal(conflict.reason, 'ENVELOPE_ID_CONFLICT');
  }
  assert.equal(store.listHeldHelpCases().length, 1);
});

test('strict source rejects money, excess fields, hidden contact fields and fabricated completion', () => {
  const reject = (candidate: unknown, reason: string) => {
    assert.deepEqual(preparePennyCandidate(JSON.stringify(candidate)), {
      disposition: 'refused', reason,
    });
  };
  reject({ ...base, status: 'confirmed' }, 'NOT_A_CANDIDATE');
  reject({ ...base, privateContact: 'someone@example.com' }, 'INVALID_SHAPE');
  reject({ ...base, requirements: [{ ...base.requirements[0], privatePhone: '5551234' }] }, 'INVALID_REQUIREMENT');
  reject({ ...base, requirements: [{ ...base.requirements[0], kind: 'money' }] }, 'UNSUPPORTED_KIND');
  reject({ ...base, requirements: [{ ...base.requirements[0], unit: undefined }] }, 'INVALID_REQUIREMENT');
  reject({ ...base, requirements: [base.requirements[0], base.requirements[0]] }, 'DUPLICATE_REQUIREMENT');
  reject({ ...base, requirements: [{ ...base.requirements[0], quantity: Number.POSITIVE_INFINITY }] }, 'INVALID_REQUIREMENT');
  reject({ ...base, requirements: [] }, 'INVALID_REQUIREMENT');
  reject({ ...base, signalId: 'x' }, 'INVALID_FIELD');
});

test('PENNY demo log is not a real candidate and cannot become a Help Slip', () => {
  const result = preparePennyCandidate(JSON.stringify({
    schema: 'penny-field-demo/1', scenario: 'grocery-trip-001', events: [],
  }));
  assert.deepEqual(result, { disposition: 'refused', reason: 'UNSUPPORTED_SCHEMA' });
});

test('no implicit network, signatures, steward certification, coins or shared authority', () => {
  const prepared = preparePennyCandidate(JSON.stringify(base));
  assert.equal(prepared.disposition, 'prepared');
  if (prepared.disposition !== 'prepared') return;
  assert.equal(JSON.stringify(prepared.payload).includes('stewardApproved'), false);
  assert.equal(JSON.stringify(prepared.payload).includes('coinCount'), false);
  assert.equal(JSON.stringify(prepared.payload).includes('witnessReceiptId'), false);
});
