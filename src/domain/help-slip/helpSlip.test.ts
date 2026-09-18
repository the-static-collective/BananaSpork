import test from 'node:test';
import assert from 'node:assert/strict';
import {
  admitHelpSlipCarrier,
  serializeFulfillmentEnvelopeV0,
} from './envelope';
import { BAND_RUNTIME_HELP_SLIP_FIXTURE } from './fixtures';

test('Help Slip serializer matches the Band Runtime golden fixture', () => {
  const admitted = admitHelpSlipCarrier(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier);
  assert.equal(admitted.disposition, 'admitted');
  if (admitted.disposition !== 'admitted') throw new Error('expected admitted');

  assert.equal(admitted.carrierHash, BAND_RUNTIME_HELP_SLIP_FIXTURE.carrierHash);
  assert.equal(admitted.canonicalPayload, BAND_RUNTIME_HELP_SLIP_FIXTURE.canonicalPayload);
  assert.equal(admitted.payloadHash, BAND_RUNTIME_HELP_SLIP_FIXTURE.payloadHash);
  assert.equal(
    serializeFulfillmentEnvelopeV0(admitted.payload),
    BAND_RUNTIME_HELP_SLIP_FIXTURE.canonicalPayload
  );
});

test('different carrier whitespace preserves payload identity but not carrier identity', () => {
  const compact = admitHelpSlipCarrier(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier);
  const spaced = admitHelpSlipCarrier(
    JSON.stringify(JSON.parse(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier), null, 2)
  );

  assert.equal(compact.disposition, 'admitted');
  assert.equal(spaced.disposition, 'admitted');
  if (compact.disposition !== 'admitted' || spaced.disposition !== 'admitted') {
    throw new Error('expected admitted');
  }

  assert.notEqual(compact.carrierHash, spaced.carrierHash);
  assert.equal(compact.payloadHash, spaced.payloadHash);
});

test('strict v0 admission refuses unknown fields and invalid quantity/unit pairs', () => {
  const payload = JSON.parse(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier);

  const unknown = admitHelpSlipCarrier(JSON.stringify({ ...payload, privatePantry: ['x'] }));
  assert.equal(unknown.disposition, 'refused');

  const noUnit = admitHelpSlipCarrier(JSON.stringify({
    ...payload,
    requirements: [{ id: 'x', kind: 'ingredient', description: 'x', quantity: 2 }],
  }));
  assert.equal(noUnit.disposition, 'refused');

  const zero = admitHelpSlipCarrier(JSON.stringify({
    ...payload,
    requirements: [{ id: 'x', kind: 'ingredient', description: 'x', quantity: 0, unit: 'each' }],
  }));
  assert.equal(zero.disposition, 'refused');
});


import { HelpSlipHoldStore, type HelpSlipStorage } from './holdStore';

class MemoryStorage implements HelpSlipStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

test('first import creates one held case with no shared link', () => {
  const storage = new MemoryStorage();
  const store = new HelpSlipHoldStore(storage);
  const result = store.holdImportedHelpSlip(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier, {
    occurrenceId: 'arrival-1',
    receivedAt: '2026-09-18T15:01:00.000Z',
  });
  assert.equal(result.disposition, 'held');
  if (result.disposition !== 'held') throw new Error();
  assert.equal(result.caseCreated, true);
  assert.equal(result.heldCase.requirementLinks.length, 0);
  assert.equal(result.heldCase.arrivals.length, 1);
});

test('same semantic payload imported twice records two arrivals but one held case', () => {
  const storage = new MemoryStorage();
  const store = new HelpSlipHoldStore(storage);
  const first = store.holdImportedHelpSlip(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier, {
    occurrenceId: 'arrival-1',
    receivedAt: '2026-09-18T15:01:00.000Z',
  });
  const second = store.holdImportedHelpSlip(
    JSON.stringify(JSON.parse(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier), null, 2),
    { occurrenceId: 'arrival-2', receivedAt: '2026-09-18T15:02:00.000Z' }
  );
  assert.equal(first.disposition, 'held');
  assert.equal(second.disposition, 'held');
  if (first.disposition !== 'held' || second.disposition !== 'held') throw new Error();
  assert.equal(second.caseCreated, false);
  assert.equal(second.heldCase.localCaseId, first.heldCase.localCaseId);
  assert.equal(second.heldCase.arrivals.length, 2);
});

test('held case reloads after store reconstruction', () => {
  const storage = new MemoryStorage();
  const firstStore = new HelpSlipHoldStore(storage);
  const first = firstStore.holdImportedHelpSlip(BAND_RUNTIME_HELP_SLIP_FIXTURE.rawCarrier, {
    occurrenceId: 'arrival-1',
    receivedAt: '2026-09-18T15:01:00.000Z',
  });
  assert.equal(first.disposition, 'held');
  if (first.disposition !== 'held') throw new Error();
  const restored = new HelpSlipHoldStore(storage).getHeldHelpCase(first.heldCase.localCaseId);
  assert.equal(restored?.payloadHash, first.heldCase.payloadHash);
});

test('malformed persisted HOLD state fails closed', () => {
  const storage = new MemoryStorage();
  storage.setItem('bananagram_help_slip_holds_v1', '{"not":"valid-case-array"}');
  assert.throws(
    () => new HelpSlipHoldStore(storage).listHeldHelpCases(),
    /MALFORMED_HELP_SLIP_HOLD_STORE/
  );
});
