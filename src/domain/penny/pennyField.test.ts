import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { HelpSlipHoldStore, type HelpSlipStorage } from '../help-slip/holdStore';
import { preparePennyCandidate } from './pennyHelpSlip';
import {
  buildCampfirePourPreview, pourHeldRequirement, projectHelpSlipResidual,
  describeHeldHelpCase,
} from '../help-slip/pour';
import type { ImportedFulfillmentEnvelopeV0 } from '../help-slip/types';

/**
 * Deterministic, synthetic proof using the exact JSON exported as the
 * offline PENNY reference example. This test mocks shared authority:
 * it is NOT proof of a live Campfire, two devices, delivery, or consent.
 */
class MemoryStorage implements HelpSlipStorage {
  private readonly records = new Map<string, string>();
  getItem(key: string): string | null { return this.records.get(key) ?? null; }
  setItem(key: string, value: string): void { this.records.set(key, value); }
  removeItem(key: string): void { this.records.delete(key); }
}
const candidateText = readFileSync(
  new URL('../../../examples/penny/field-001-candidate.json', import.meta.url), 'utf8'
);
const at = '2026-10-19T21:00:00.000Z';

test('FIELD-001 dry run: source -> local HOLD -> explicit mock POUR -> report -> confirmation -> restart', async () => {
  const prepared = preparePennyCandidate(candidateText);
  assert.equal(prepared.disposition, 'prepared');
  if (prepared.disposition !== 'prepared') return;

  const deviceA = new MemoryStorage();
  const a = new HelpSlipHoldStore(deviceA);
  const deviceB = new HelpSlipHoldStore(new MemoryStorage());

  assert.deepEqual(deviceB.listHeldHelpCases(), [], 'a distinct device gets no private copy by default');
  const held = a.holdImportedHelpSlip(prepared.carrier, { occurrenceId: 'arrival-a', receivedAt: at });
  assert.equal(held.disposition, 'held');
  if (held.disposition !== 'held') return;
  const originalSource: ImportedFulfillmentEnvelopeV0 = held.heldCase.payload;
  const originalHash = held.heldCase.payloadHash;
  assert.equal(held.heldCase.requirementLinks.length, 0);
  assert.equal(describeHeldHelpCase(held.heldCase, [], 'current').sharingLabel, 'Not shared');
  assert.equal(deviceB.listHeldHelpCases().length, 0);

  // Whitespace changes are a new arrival, not another demand.
  const canonicalOrderChanged = JSON.stringify({
    status: 'candidate',
    requirements: JSON.parse(candidateText).requirements,
    purpose: 'Practice need: neighbor groceries',
    signalId: 'sample-grocery-001',
    createdAt: at,
    schema: 'penny-box-candidate/v0',
  }, null, 2);
  const secondPreparation = preparePennyCandidate(canonicalOrderChanged);
  assert.equal(secondPreparation.disposition, 'prepared');
  if (secondPreparation.disposition !== 'prepared') return;
  const again = a.holdImportedHelpSlip(secondPreparation.carrier, { occurrenceId: 'arrival-b', receivedAt: at });
  assert.equal(again.disposition, 'held');
  if (again.disposition !== 'held') return;
  assert.equal(again.caseCreated, false);
  assert.equal(again.heldCase.arrivals.length, 2);
  assert.equal(a.listHeldHelpCases().length, 1);

  const item = buildCampfirePourPreview(
    again.heldCase, 'item-beans-001', { circleId: 'test-circle', circleLabel: 'TEST circle' }
  );
  assert.deepEqual(item.command, {
    title: 'Dry beans (synthetic practice)',
    summary: 'Dry beans (synthetic practice)',
    requestedItems: ['Dry beans (synthetic practice)'],
    unitLabel: 'bag', targetUnits: 2, visibility: 'circle',
  });
  const publicProjection = JSON.stringify(item.command);
  for (const secret of ['sample-grocery-001', 'Practice need: neighbor groceries', 'penny-box:',
                        'ride-grocery-001', 'PENNY BOX (unverified candidate)']) {
    assert.equal(publicProjection.includes(secret), false, secret + ' must stay out of the projection');
  }

  // A preview and cancellation create no shared action. Mock authority only runs on explicit POUR.
  let mockOpenCalls = 0;
  const openSharedNeed = async () => {
    mockOpenCalls++;
    return { success: true, data: { authorityNeedId: 'mock-need-001' } };
  };
  assert.equal(mockOpenCalls, 0);
  assert.equal(a.getHeldHelpCase(held.heldCase.localCaseId)?.requirementLinks.length, 0);

  const refused = await pourHeldRequirement({
    heldCase: again.heldCase, preview: item,
    openSharedNeed: async () => {
      mockOpenCalls++;
      return { success: false, error: 'NO_TEST_CAMPFIRE_MEMBERSHIP' };
    },
    addRequirementLink: () => { throw Error('No link expected from a refusal'); },
    refreshSharedState: async () => { throw Error('No refresh expected'); },
    now: () => at,
  });
  assert.equal(refused.status, 'authority_failed');
  assert.equal(a.listHeldHelpCases()[0].requirementLinks.length, 0);

  const shared = await pourHeldRequirement({
    heldCase: again.heldCase, preview: item,
    openSharedNeed,
    addRequirementLink: (link) => { a.addRequirementLink(again.heldCase.localCaseId, link); },
    refreshSharedState: async () => {},
    now: () => at,
  });
  assert.equal(shared.status, 'shared');
  assert.equal(mockOpenCalls, 2, 'one refused mock and one successful mock attempt');
  const after = a.getHeldHelpCase(again.heldCase.localCaseId)!;
  assert.equal(after.requirementLinks.length, 1);
  assert.equal(after.requirementLinks[0].authorityNeedId, 'mock-need-001');
  assert.deepEqual(after.payload, originalSource, 'source cannot be rewritten by shared projection');

  // A reported delivery does not affect the residual. Only independently
  // confirmed quantity changes the simulated projection.
  const reported = projectHelpSlipResidual(after, [{ needId: 'mock-need-001', confirmedUnits: 0 }]);
  const beansReported = reported.find((item) => item.requirementId === 'item-beans-001')!;
  assert.equal(beansReported.confirmedResidual, 2);
  assert.equal(reported.find((item) => item.requirementId === 'ride-grocery-001')!.shared, false);
  const confirmed = projectHelpSlipResidual(after, [{ needId: 'mock-need-001', confirmedUnits: 1 }]);
  assert.equal(confirmed.find((item) => item.requirementId === 'item-beans-001')!.confirmedResidual, 1);
  assert.equal(describeHeldHelpCase(after, [{ needId: 'mock-need-001', confirmedUnits: 1 }], 'current').sharingLabel, 'Partially confirmed');

  const restarted = new HelpSlipHoldStore(deviceA).getHeldHelpCase(again.heldCase.localCaseId)!;
  assert.equal(restarted.payloadHash, originalHash);
  assert.equal(restarted.arrivals.length, 2);
  assert.equal(restarted.requirementLinks.length, 1);
  assert.deepEqual(restarted.payload, originalSource);
  assert.equal(projectHelpSlipResidual(restarted, [{ needId: 'mock-need-001', confirmedUnits: 1 }])[0].confirmedResidual, 1);
  assert.deepEqual(deviceB.listHeldHelpCases(), [], 'mock shared authority does not sync private HOLD');
});

test('FIELD-001 tampering with one signal is a refused conflict, not a second demand', () => {
  const prepared = preparePennyCandidate(candidateText);
  assert.equal(prepared.disposition, 'prepared');
  if (prepared.disposition !== 'prepared') return;
  const store = new HelpSlipHoldStore(new MemoryStorage());
  store.holdImportedHelpSlip(prepared.carrier, { occurrenceId: 'arrival-a', receivedAt: at });
  const changed = JSON.parse(candidateText);
  changed.requirements[0].quantity = 3;
  const tampered = preparePennyCandidate(JSON.stringify(changed));
  assert.equal(tampered.disposition, 'prepared');
  if (tampered.disposition !== 'prepared') return;
  const conflict = store.holdImportedHelpSlip(tampered.carrier, { occurrenceId: 'arrival-c', receivedAt: at });
  assert.equal(conflict.disposition, 'refused');
  if (conflict.disposition === 'refused') assert.equal(conflict.reason, 'ENVELOPE_ID_CONFLICT');
  assert.equal(store.listHeldHelpCases().length, 1);
});
