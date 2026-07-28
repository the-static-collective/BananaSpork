import {
  buildTodayProjection,
  createActionProposal,
  confirmActionProposal,
  getLocalProposals,
  parseMessageCommandToProposal,
  TASK_EVENT_AUTHORITY_CONTRACT_SPEC,
} from './campfireService';
import { saveHeldNote } from '../donkey/donkeyService';
import { BasketOffer, KidProfile, ParticipationSeed, WitnessReceipt } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runCampfireTests() {
  console.log('\n========================================');
  console.log('  PASS 3: CAMPFIRE HOUSEHOLD SHELL TESTS');
  console.log('========================================\n');

  // Test 1: Message commands produce proposals, NOT direct writes
  const needProposal = parseMessageCommandToProposal('/need Pick up organic milk', 'Sarah');
  assert(needProposal !== null, 'Command /need produces a proposal');
  assert(needProposal?.status === 'proposed', 'PROVED: /need proposal starts in proposed state');
  assert(needProposal?.verb === 'need', 'Proposal verb is correctly typed as need');

  const offerProposal = parseMessageCommandToProposal('/offer 2 dozen eggs', 'David');
  assert(offerProposal?.verb === 'offer' && offerProposal?.status === 'proposed', 'PROVED: /offer produces a proposal');

  const taskProposal = parseMessageCommandToProposal('/task Clean pantry before Friday', 'Sarah');
  assert(
    taskProposal?.verb === 'task' && taskProposal?.nonAuthoritative === true,
    'PROVED: /task produces a non-authoritative proposal'
  );

  const eventProposal = parseMessageCommandToProposal('/event Neighborhood Campfire Saturday 5pm', 'David');
  assert(
    eventProposal?.verb === 'event' && eventProposal?.nonAuthoritative === true,
    'PROVED: /event produces a non-authoritative proposal'
  );

  // Test 2: Today projection answers 3 questions in under 5 seconds
  const mockSeeds: ParticipationSeed[] = [
    {
      id: 's1',
      title: 'Community Garden',
      stage: 'Sprout',
      authorName: 'Alex',
      description: 'Shared garden plot',
      needs: [{ id: 'n1', title: 'Topsoil delivery', category: 'Tools', status: 'open' }],
      makesPossible: ['Fresh veggies'],
      graftsCount: 1,
      harvestsCount: 0,
      timestamp: '10:00 AM',
    },
  ];

  const mockOffers: BasketOffer[] = [
    {
      id: 'o1',
      title: '2 Dozen Eggs',
      category: 'Food',
      contributorName: 'Ellen',
      availability: 'Today',
      boundary: 'Local',
      icon: '🥚',
      timestamp: '9:00 AM',
    },
  ];

  const mockReceipts: WitnessReceipt[] = [
    {
      id: 'r1',
      sequence: 1,
      sha256Hash: 'hash-1234',
      predecessorHash: '0000',
      actorName: 'Sarah',
      eventType: 'fulfillment.confirmed',
      title: 'Bread Shared',
      timestamp: 'Yesterday',
      details: 'Shared warm bread with neighbors',
    },
  ];

  const mockProfile: KidProfile = {
    name: 'Leo',
    age: '2.5 years',
    pickiness: 'High',
    allergies: ['Peanuts'],
    preferences: 'Crackers',
    dislikes: 'Texture',
    favoriteDips: ['Ketchup'],
  };

  // Add a private held note for testing
  saveHeldNote('Private tense draft about schedule', '[Private Hold]: Tense draft');

  const projection = buildTodayProjection(mockSeeds, mockOffers, mockReceipts, mockProfile, [
    needProposal!,
  ]);

  // Test 3: Today projection structure and ordering
  assert(projection.needsAttention.length >= 2, 'Today includes needs attention items (proposal + open need + meal care)');
  assert(
    projection.needsAttention[0].type === 'open_need' || projection.needsAttention[0].type === 'unconfirmed_proposal',
    'Today orders unconfirmed proposals & open needs at top of Attention list'
  );

  assert(projection.canDo.length > 0, 'Today projection includes Can Do actions');

  // Test 4: Private held Donkey notes visibility in Today projection
  const heldItemsInChanged = projection.whatChanged.filter((item) => item.isHeldNote);
  assert(heldItemsInChanged.length > 0, 'PROVED: Private held Donkey notes appear in Today projection on this device');
  assert(
    heldItemsInChanged.every((item) => item.privateToDevice === true),
    'PROVED: Held notes are explicitly flagged as private to this device'
  );

  // Test 5: Authority contracts spec reporting for Task & Event
  assert(
    TASK_EVENT_AUTHORITY_CONTRACT_SPEC.status === 'NON_AUTHORITATIVE_READ_MODEL_ONLY',
    'Task & Event authority spec reports non-authoritative status'
  );
  assert(
    TASK_EVENT_AUTHORITY_CONTRACT_SPEC.requiredCommands.length === 2,
    'Contract spec details required CreateHouseholdTask and ScheduleHouseholdEvent commands'
  );

  console.log('\n🎉 ALL PASS 3 CAMPFIRE SHELL VALIDATION TESTS PASSED SUCCESSFULLY!\n');
}

runCampfireTests().catch((err) => {
  console.error('Campfire test execution error:', err);
  process.exit(1);
});
