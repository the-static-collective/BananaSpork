import type { CanonicalValue } from '../src/domain/canonical';

export type ParityFixture = {
  name: string;
  input: CanonicalValue;
  canonical: string;
  sha256: string;
};

export const FIXTURES: Omit<ParityFixture, 'sha256'>[] = [
  { name: 'null', input: null, canonical: 'null' },
  { name: 'true', input: true, canonical: 'true' },
  { name: 'false', input: false, canonical: 'false' },
  { name: 'zero', input: 0, canonical: '0' },
  { name: 'positive int', input: 42, canonical: '42' },
  { name: 'negative int', input: -7, canonical: '-7' },
  { name: 'empty string', input: '', canonical: '""' },
  { name: 'plain ascii', input: 'oatmeal', canonical: '"oatmeal"' },
  { name: 'quote+backslash', input: 'she said "hi\\bye"', canonical: '"she said \\"hi\\\\bye\\""' },
  { name: 'escaped controls', input: 'line1\nline2\t\r', canonical: '"line1\\nline2\\t\\r"' },
  { name: 'combining unicode', input: 'cafe\u0301', canonical: '"cafe\u0301"' },
  { name: 'non-BMP banana', input: '🍌 breakfast', canonical: '"🍌 breakfast"' },
  { name: 'empty array', input: [], canonical: '[]' },
  { name: 'empty object', input: {}, canonical: '{}' },
  { name: 'int array', input: [1, 2, 3], canonical: '[1,2,3]' },
  { name: 'mixed array', input: [null, true, 'x', 0], canonical: '[null,true,"x",0]' },
  { name: 'sorted keys', input: { b: 1, a: 2 }, canonical: '{"a":2,"b":1}' },
  {
    name: 'nested',
    input: {
      schema: 'bananagram.witness-event/v1',
      sequence: 3,
      kind: 'offer.pledged',
      occurredAt: '2026-07-28T10:00:00.000Z',
      circleId: '00000000-0000-0000-0000-000000000000',
      aggregateId: '11111111-1111-1111-1111-111111111111',
      actor: { id: '22222222-2222-2222-2222-222222222222', label: 'Alice', role: 'neighbor' },
      payload: {
        needId: '33333333-3333-3333-3333-333333333333',
        contributorId: '22222222-2222-2222-2222-222222222222',
        contributorLabel: 'Alice',
        contributorRole: 'neighbor',
        kind: 'goods',
        label: '🍌 oatmeal box',
        promisedUnits: 2,
      },
      previousHash: 'GENESIS',
    },
    canonical:
      '{"actor":{"id":"22222222-2222-2222-2222-222222222222","label":"Alice","role":"neighbor"},"aggregateId":"11111111-1111-1111-1111-111111111111","circleId":"00000000-0000-0000-0000-000000000000","kind":"offer.pledged","occurredAt":"2026-07-28T10:00:00.000Z","payload":{"contributorId":"22222222-2222-2222-2222-222222222222","contributorLabel":"Alice","contributorRole":"neighbor","kind":"goods","label":"🍌 oatmeal box","needId":"33333333-3333-3333-3333-333333333333","promisedUnits":2},"previousHash":"GENESIS","schema":"bananagram.witness-event/v1","sequence":3}',
  },
];
