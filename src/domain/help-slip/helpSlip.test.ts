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


import {
  buildCampfirePourPreview,
  projectHelpSlipResidual,
} from './pour';
import type { GardenHeldHelpCase, FulfillmentRequirementV0 } from './types';
import type { NeedProjection } from '../../lib/circle';

function makeHeldCase(options: {
  requirements: FulfillmentRequirementV0[];
  requirementLinks?: GardenHeldHelpCase['requirementLinks'];
}): GardenHeldHelpCase {
  return {
    localCaseId: 'help-case:test-hash',
    envelopeId: 'env-test',
    payloadHash: 'test-hash',
    payload: {
      schema: 'fulfillment-envelope/v0',
      envelopeId: 'env-test',
      purpose: 'Dinner for three',
      createdAt: '2026-09-18T15:00:00.000Z',
      requirements: options.requirements,
      source: {
        system: 'Nourish-Kids',
        recipeId: 'recipe-private-1',
      },
      disclosure: {
        includesOnlySelectedResiduals: true,
        omittedPrivateContext: true,
      },
      status: 'unmet',
    },
    heldAt: '2026-09-18T15:01:00.000Z',
    status: 'held',
    arrivals: [{
      occurrenceId: 'arrival-1',
      receivedAt: '2026-09-18T15:01:00.000Z',
      carrierHash: 'carrier-hash',
    }],
    requirementLinks: options.requirementLinks ?? [],
  };
}

function linkedNeed(input: {
  needId: string;
  targetUnits: number;
  confirmedUnits: number;
  unitLabel: string;
  offerStatus?: 'pledged' | 'accepted' | 'declined' | 'reported' | 'confirmed';
}): NeedProjection {
  return {
    needId: input.needId,
    householdId: 'household-1',
    householdLabel: 'Household',
    title: 'Need',
    summary: 'Need',
    requestedItems: ['Need'],
    unitLabel: input.unitLabel,
    targetUnits: input.targetUnits,
    confirmedUnits: input.confirmedUnits,
    status: input.confirmedUnits >= input.targetUnits ? 'fulfilled' : 'open',
    visibility: 'circle',
    createdAt: '2026-09-18T15:10:00.000Z',
    offers: input.offerStatus ? [{
      offerId: 'offer-1',
      needId: input.needId,
      contributorId: 'neighbor-1',
      contributorLabel: 'Neighbor',
      contributorRole: 'neighbor',
      kind: 'goods',
      label: 'Support',
      promisedUnits: input.targetUnits,
      confirmedUnits: input.confirmedUnits,
      status: input.offerStatus,
    }] : [],
  };
}

test('POUR projection preserves quantity/unit and omits source metadata', () => {
  const held = makeHeldCase({
    requirements: [
      { id: 'ingredient:tomatoes', kind: 'ingredient', description: 'Canned tomatoes', quantity: 2, unit: 'can' },
      { id: 'equipment:skillet', kind: 'equipment', description: 'Skillet' },
    ],
  });

  const preview = buildCampfirePourPreview(
    held,
    'ingredient:tomatoes',
    { circleId: 'circle-1', circleLabel: 'Neighbors' }
  );

  assert.deepEqual(preview.command, {
    title: 'Canned tomatoes',
    summary: 'Canned tomatoes',
    requestedItems: ['Canned tomatoes'],
    unitLabel: 'can',
    targetUnits: 2,
    visibility: 'circle',
  });

  const shared = JSON.stringify(preview.command);
  for (const forbidden of ['recipeId', 'envelopeId', 'payloadHash', 'Nourish-Kids', 'Dinner for three']) {
    assert.equal(shared.includes(forbidden), false, `must not leak ${forbidden}`);
  }
});

test('qualitative requirement projects as one item with an explicit notice', () => {
  const held = makeHeldCase({
    requirements: [{ id: 'equipment:skillet', kind: 'equipment', description: 'Skillet' }],
  });
  const preview = buildCampfirePourPreview(
    held,
    'equipment:skillet',
    { circleId: 'circle-1', circleLabel: 'Neighbors' }
  );
  assert.equal(preview.command.targetUnits, 1);
  assert.equal(preview.command.unitLabel, 'item');
  assert.equal(preview.qualitativeQuantityNotice, true);
});

test('heterogeneous requirements are addressed one at a time', () => {
  const held = makeHeldCase({
    requirements: [
      { id: 'a', kind: 'ingredient', description: 'Tomatoes', quantity: 2, unit: 'can' },
      { id: 'b', kind: 'equipment', description: 'Skillet' },
    ],
  });
  assert.throws(
    () => buildCampfirePourPreview(held, 'missing-id', { circleId: 'circle-1', circleLabel: 'Neighbors' }),
    /HELP_SLIP_REQUIREMENT_NOT_FOUND/
  );
});

test('reported support does not reduce residual; confirmed units do', () => {
  const held = makeHeldCase({
    requirements: [
      { id: 'ingredient:tomatoes', kind: 'ingredient', description: 'Tomatoes', quantity: 4, unit: 'can' },
    ],
    requirementLinks: [{
      localCaseId: 'help-case:test-hash',
      requirementId: 'ingredient:tomatoes',
      payloadHash: 'test-hash',
      circleId: 'circle-1',
      authorityNeedId: 'need-1',
      pouredAt: '2026-09-18T15:10:00.000Z',
    }],
  });

  const reportedOnly = projectHelpSlipResidual(held, [
    linkedNeed({ needId: 'need-1', targetUnits: 4, confirmedUnits: 0, unitLabel: 'can', offerStatus: 'reported' }),
  ]);
  assert.equal(reportedOnly[0].confirmedResidual, 4);

  const partiallyConfirmed = projectHelpSlipResidual(held, [
    linkedNeed({ needId: 'need-1', targetUnits: 4, confirmedUnits: 2, unitLabel: 'can' }),
  ]);
  assert.equal(partiallyConfirmed[0].confirmedResidual, 2);
});
