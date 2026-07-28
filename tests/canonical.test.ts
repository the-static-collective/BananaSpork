import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson } from '../src/domain/canonical';
import { sha256Hex } from '../src/domain/hashes';
import { envelopeFor, computeEventHash, verifyChain, type EventRow } from '../src/domain/events';
import { FIXTURES } from './canonical-fixtures';

test('canonicalJson emits expected byte-sequences', () => {
  for (const f of FIXTURES) {
    assert.equal(canonicalJson(f.input), f.canonical, `canonical mismatch: ${f.name}`);
  }
});

test('sha256Hex is stable and matches known good vectors', () => {
  // Known NIST test vector: sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(
    sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('emit sha256 for each fixture', () => {
  for (const f of FIXTURES) {
    const h = sha256Hex(f.canonical);
    assert.match(h, /^[0-9a-f]{64}$/);
  }
});

test('repaired event envelope matching SQL append_event exact shape', () => {
  const sampleEvent: EventRow = {
    event_id: 'e1111111-1111-1111-1111-111111111111',
    circle_id: 'c2222222-2222-2222-2222-222222222222',
    sequence: 1,
    kind: 'need.opened',
    occurred_at: '2026-07-28T10:00:00.000Z',
    occurred_at_text: '2026-07-28T10:00:00.000Z',
    actor_user_id: 'u3333333-3333-3333-3333-333333333333',
    actor_label: 'Sarah',
    actor_role: 'household',
    aggregate_id: 'a4444444-4444-4444-4444-444444444444',
    payload: {
      title: '🍌 Organic Banana Milk',
      summary: 'Need 2 gallons of organic milk for 🍌 breakfast',
    },
    previous_hash: 'GENESIS',
    event_hash: '',
  };

  const env = envelopeFor(sampleEvent) as Record<string, any>;
  assert.equal(env.schema, 'bananagram.witness-event/v1');
  assert.equal(env.eventId, 'e1111111-1111-1111-1111-111111111111');
  assert.equal(env.circleId, undefined, 'circleId MUST NOT be in the hashed envelope');
  assert.equal(env.sequence, 1);
  assert.equal(env.kind, 'need.opened');

  const computedHash = computeEventHash(sampleEvent);
  sampleEvent.event_hash = computedHash;

  const result = verifyChain([sampleEvent]);
  assert.equal(result.ok, true, 'repaired event envelope verifies successfully');

  // Tamper test
  const tamperedEvent = { ...sampleEvent, payload: { ...sampleEvent.payload, title: 'Tampered' } };
  const tamperedResult = verifyChain([tamperedEvent]);
  assert.equal(tamperedResult.ok, false, 'tampered payload fails verification');
});
