import { readApiRuntimeConfig, resolveApiUrl } from '../src/lib/api';
import { readSupabasePublicConfig } from '../src/integrations/supabase/config';
import { projectSharedSeeds } from '../src/domain/jubilee/SupabaseJubileeGateway';
import { projectNeeds, type NeedProjection } from '../src/lib/circle';
import type { EventRow } from '../src/domain/events';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

const missingSupabase = readSupabasePublicConfig({});
assert(!missingSupabase.configured, 'Missing Supabase environment enters local mode without throwing');

const configuredSupabase = readSupabasePublicConfig({
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
});
assert(configuredSupabase.configured, 'HTTPS Supabase publishable configuration is accepted');

const nativeWithoutApi = readApiRuntimeConfig({}, true, false);
assert(
  !nativeWithoutApi.configured,
  'Native runtime fails closed when a remote API base is not configured'
);

const nativeWithHttpsApi = readApiRuntimeConfig(
  { VITE_API_BASE_URL: 'https://nanaspork.example/' },
  true,
  false
);
assert(nativeWithHttpsApi.configured, 'Native runtime accepts an HTTPS API origin');
assert(
  resolveApiUrl('/api/chat', nativeWithHttpsApi) === 'https://nanaspork.example/api/chat',
  'Native API paths resolve against the configured remote origin'
);

const nativeWithHttpApi = readApiRuntimeConfig(
  { VITE_API_BASE_URL: 'http://nanaspork.example' },
  true,
  false
);
assert(!nativeWithHttpApi.configured, 'Native runtime rejects cleartext API traffic');

const webSameOrigin = readApiRuntimeConfig({}, false, false);
assert(
  resolveApiUrl('/api/chat', webSameOrigin) === '/api/chat',
  'Web runtime retains same-origin API routing'
);

const needProjection: NeedProjection = {
  needId: 'need-1',
  householdId: 'household-1',
  householdLabel: 'First Household',
  title: 'Bring soup',
  summary: 'A shared need',
  requestedItems: ['Soup'],
  unitLabel: 'meals',
  targetUnits: 1,
  confirmedUnits: 0,
  status: 'open',
  visibility: 'circle',
  createdAt: '2026-07-30T12:00:00.000Z',
  offers: [
    {
      offerId: 'offer-1',
      needId: 'need-1',
      contributorId: 'neighbor-1',
      contributorLabel: 'Neighbor',
      contributorRole: 'neighbor',
      kind: 'goods',
      label: 'One pot of soup',
      promisedUnits: 1,
      confirmedUnits: 0,
      status: 'reported',
    },
  ],
};

const projectedSeed = projectSharedSeeds([needProjection])[0];
const projectedOffer = projectedSeed.needs.find((need) => need.authorityOfferId === 'offer-1');
assert(
  projectedOffer?.authorityNeedId === 'need-1' && projectedOffer.status === 'reported',
  'Shared projection preserves distinct need and offer authority IDs'
);

const event = (
  sequence: number,
  kind: string,
  aggregateId: string,
  payload: EventRow['payload']
): EventRow => ({
  event_id: `event-${sequence}`,
  circle_id: 'circle-1',
  sequence,
  kind,
  occurred_at: `2026-07-30T12:00:0${sequence}.000Z`,
  occurred_at_text: `2026-07-30T12:00:0${sequence}.000Z`,
  actor_user_id: 'user-1',
  actor_label: 'Member',
  actor_role: 'household',
  aggregate_id: aggregateId,
  payload,
  previous_hash: sequence === 1 ? 'GENESIS' : `hash-${sequence - 1}`,
  event_hash: `hash-${sequence}`,
});

const closedFulfilledNeed = projectNeeds([
  event(1, 'need.opened', 'need-complete', {
    householdId: 'household-1',
    householdLabel: 'First Household',
    title: 'Bring soup',
    summary: 'A shared need',
    requestedItems: ['Soup'],
    unitLabel: 'meal',
    targetUnits: 1,
    visibility: 'circle',
  }),
  event(2, 'offer.pledged', 'offer-complete', {
    needId: 'need-complete',
    contributorId: 'neighbor-1',
    contributorLabel: 'Neighbor',
    contributorRole: 'neighbor',
    kind: 'goods',
    label: 'One pot of soup',
    promisedUnits: 1,
  }),
  event(3, 'fulfillment.confirmed', 'offer-complete', {
    needId: 'need-complete',
    confirmedUnits: 1,
  }),
  event(4, 'need.closed', 'need-complete', {
    reason: 'fulfilled',
  }),
])[0];
assert(
  closedFulfilledNeed.status === 'fulfilled',
  'Closing a fully confirmed need preserves its fulfilled/harvest projection'
);

console.log('\n🎉 RUNTIME CONFIGURATION AND SHARED PROJECTION TESTS PASSED\n');
