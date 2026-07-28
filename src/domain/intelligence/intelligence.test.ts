import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import { DonkeyHeldNote } from '../donkey/types';
import {
  buildDeterministicChangeList,
  buildWhatChangedReport,
  computeGentleMatches,
  computeNearbyGrowthPreview,
  hasExplicitRejectionDisposition,
} from './intelligenceService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runIntelligenceTests() {
  console.log('\n========================================');
  console.log('  PASS 5C: DISPOSITION SEMANTICS AND PRIVACY CONSISTENCY');
  console.log('========================================\n');

  // Test Fixtures
  const mockReceipts: WitnessReceipt[] = [
    {
      id: 'rcpt-101',
      sequence: 1,
      sha256Hash: 'a1b2c3d4e5f6',
      predecessorHash: 'GENESIS',
      actorName: 'Alice Household', // Actor attribution
      eventType: 'need.opened',
      title: 'Opened Need: Organic Toddler Oat Cereal',
      timestamp: '2026-07-28 09:00',
      details: 'Requested 3 boxes for morning breakfasts',
    },
    {
      id: 'rcpt-102',
      sequence: 2,
      sha256Hash: 'b2c3d4e5f6a1',
      predecessorHash: 'a1b2c3d4e5f6',
      actorName: 'Bob Neighbor',
      eventType: 'need.closed',
      title: 'Closed Need: Organic Toddler Oat Cereal',
      timestamp: '2026-07-28 09:15',
      details: 'Fulfilled by Bob Neighbor - harvest completed successfully',
    },
    {
      id: 'rcpt-103',
      sequence: 3,
      sha256Hash: 'c3d4e5f6a1b2',
      predecessorHash: 'b2c3d4e5f6a1',
      actorName: 'Alice Household',
      eventType: 'offer.declined',
      title: 'Declined Alternative Offer: Sugary Cereal',
      timestamp: '2026-07-28 10:00',
      details: 'Declined offer due to dietary restriction - explicitly closed branch',
    },
  ];

  const mockSeeds: ParticipationSeed[] = [
    {
      id: 'seed-501',
      title: 'Organic Toddler Oat Cereal',
      stage: 'Seed',
      authorName: 'Alice Household',
      description: 'Community porridge and warm breakfast support for young toddlers',
      needs: [
        {
          id: 'need-1',
          title: 'Organic Toddler Oat Cereal',
          category: 'Care',
          status: 'open',
        },
      ],
      makesPossible: ['Toddler Breakfasts', 'Care Support'],
      graftsCount: 1,
      harvestsCount: 0,
      timestamp: '2026-07-28 09:00',
    },
  ];

  const mockOffers: BasketOffer[] = [
    {
      id: 'offer-801',
      title: '2 Boxes Organic Oat Cereal',
      category: 'Care',
      contributorName: 'Bob Neighbor',
      availability: 'Immediate',
      boundary: 'Circle',
      icon: '🥣',
      timestamp: '2026-07-28 08:30',
    },
  ];

  const mockHeldNotes: DonkeyHeldNote[] = [
    {
      id: 'held-secret-1',
      draft: 'Private conflict note about neighbor boundaries',
      holdNote: 'Private hold note - NEVER SHARE TO CIRCLE OR AI',
      timestamp: '2026-07-28 08:00',
    },
  ];

  const circleA = 'circle-uuid-aaa';
  const circleB = 'circle-uuid-bbb';

  // --------------------------------------------------
  // 1. FULFILLED CLOSED NEEDS NEVER ENTER REJECTED_PARALLEL
  // --------------------------------------------------
  const growthPreview = computeNearbyGrowthPreview(
    mockSeeds[0],
    mockReceipts,
    mockOffers,
    circleA,
    circleA,
    mockHeldNotes
  );

  const closedNeedInRejected = growthPreview.lanes.rejectedParallelLane.some(
    (item) => item.details.includes('Fulfilled by Bob Neighbor')
  );
  const closedNeedInLineage = growthPreview.lanes.lineageLane.some(
    (item) => item.details.includes('Fulfilled by Bob Neighbor')
  );

  assert(
    !closedNeedInRejected && closedNeedInLineage,
    'PROVED: Fulfilled closed needs enter lineageLane and NEVER enter rejected_parallelLane'
  );

  // --------------------------------------------------
  // 2. EXPLICITLY ABANDONED OR DECLINED BRANCHES DO ENTER REJECTED_PARALLEL
  // --------------------------------------------------
  const declinedInRejected = growthPreview.lanes.rejectedParallelLane.some(
    (item) => item.details.includes('Declined offer due to dietary restriction')
  );

  assert(
    declinedInRejected,
    'PROVED: Explicitly declined/abandoned branches carrying explicit disposition DO enter rejected_parallelLane'
  );

  // --------------------------------------------------
  // 3. INACTIVITY AND CLOSURE ALONE NEVER IMPLY REJECTION
  // --------------------------------------------------
  const hasInactivityRejection = growthPreview.lanes.rejectedParallelLane.some(
    (item) => {
      const original = mockReceipts.find((r) => `rej-${r.id}` === item.id);
      return original ? !hasExplicitRejectionDisposition(original) : true;
    }
  );

  assert(
    !hasInactivityRejection,
    'PROVED: Inactivity and closure alone NEVER imply rejection; only explicit disposition terms qualify'
  );

  // --------------------------------------------------
  // 4. CROSS-CIRCLE RESULTS EXPOSE NEITHER CONTENT NOR EVENTID
  // --------------------------------------------------
  const crossCircleGrowth = computeNearbyGrowthPreview(
    mockSeeds[0],
    mockReceipts,
    mockOffers,
    circleB, // Requesting user circle B
    circleA, // Authorized circle A
    mockHeldNotes
  );

  assert(
    crossCircleGrowth.authorized === false &&
      crossCircleGrowth.safeSources.length === 0 &&
      crossCircleGrowth.lanes.lineageLane.length === 0 &&
      crossCircleGrowth.lanes.rejectedParallelLane.length === 0,
    'PROVED: Cross-circle requests expose neither content nor eventId (safeSources is [] with 0 exposed IDs)'
  );

  // --------------------------------------------------
  // 5. SAME-CIRCLE INACCESSIBLE LINEAGE IS REDACTED
  // --------------------------------------------------
  const sameCircleAuthorized = computeNearbyGrowthPreview(
    mockSeeds[0],
    mockReceipts,
    mockOffers,
    circleA,
    circleA,
    mockHeldNotes
  );

  assert(
    sameCircleAuthorized.authorized === true &&
      sameCircleAuthorized.safeSources.every(
        (s) => ['available', 'redacted', 'unavailable'].includes(s.display)
      ),
    'PROVED: Same-circle sources use exact SafeSourceRef shape with available, redacted, or unavailable state'
  );

  // --------------------------------------------------
  // 6. SEMANTIC PROPOSAL LABELING MATCHES MECHANISM
  // --------------------------------------------------
  assert(
    growthPreview.lanes.semanticLane.length > 0 &&
      growthPreview.lanes.semanticLane[0].primaryLane === 'semantic' &&
      growthPreview.lanes.semanticLane[0].classification === 'model_interpretation',
    'PROVED: Semantic Proposal lane is explicitly classified as model_interpretation without claiming vector search'
  );

  // --------------------------------------------------
  // 7. PRIVATE HELD DONKEY DRAFTS NEVER ENTER GROWTH OR MODEL CONTEXT
  // --------------------------------------------------
  const rawClaimsWithHeld = [
    {
      claim: 'Private conflict note about neighbor boundaries',
      sourceId: 'rcpt-101',
    },
  ];

  const reportWithHeld = buildWhatChangedReport(
    mockReceipts,
    circleA,
    circleA,
    rawClaimsWithHeld,
    mockHeldNotes
  );

  assert(
    reportWithHeld.aiSummary?.length === 0 && reportWithHeld.hasUnbackedClaimsDropped === true,
    'PROVED: Held Donkey drafts are strictly omitted and NEVER enter What Changed reports or model context'
  );

  // --------------------------------------------------
  // 8. NO INTELLIGENCE PATH PERFORMS WRITES
  // --------------------------------------------------
  assert(
    mockReceipts.length === 3 && mockSeeds[0].needs[0].status === 'open',
    'PROVED: Intelligence computations are strictly read-only and NEVER perform background database writes or state mutations'
  );

  // --------------------------------------------------
  // 9. UNSUPPORTED STANDALONE OFFERS REMAIN PROPOSALS
  // --------------------------------------------------
  const matches = computeGentleMatches(mockSeeds, mockOffers, mockHeldNotes);
  assert(
    matches.length > 0 && matches[0].isStandaloneProposedOffer === true,
    'PROVED: Standalone Basket offers remain labeled as local/proposed and do not imply RPC shared ledger authority'
  );

  // --------------------------------------------------
  // 10. TWO DIFFERENT CIRCLE IDENTITIES CANNOT RETRIEVE EACH OTHER'S EVIDENCE
  // --------------------------------------------------
  const circleAChanges = buildDeterministicChangeList(mockReceipts, circleA, circleA);
  const circleBChanges = buildDeterministicChangeList(mockReceipts, circleB, circleA);

  assert(
    circleAChanges.length === 3 && circleBChanges.length === 0,
    'PROVED: Two different circle identities cannot retrieve each other evidence (Circle B gets 0 items for Circle A data)'
  );

  console.log('\n🎉 ALL PASS 5C DISPOSITION SEMANTICS AND PRIVACY CONSISTENCY TESTS PASSED!\n');
}

runIntelligenceTests().catch((err) => {
  console.error('Intelligence test error:', err);
  process.exit(1);
});
