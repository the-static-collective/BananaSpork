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
