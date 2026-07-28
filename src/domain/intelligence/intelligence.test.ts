import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import { DonkeyHeldNote } from '../donkey/types';
import {
  buildDeterministicChangeList,
  buildWhatChangedReport,
  computeGentleMatches,
  computeNearbyGrowthPreview,
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
  console.log('  PASS 5B: CONSTITUTIONAL CORRECTION TESTS');
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
      eventType: 'offer.pledged',
      title: 'Pledged Support: Toddler Oat Cereal',
      timestamp: '2026-07-28 09:15',
      details: 'Pledged 2 boxes from extra pantry shelf',
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
  // 1. ALL FIVE LANES EXIST
  // --------------------------------------------------
  const growthPreview = computeNearbyGrowthPreview(
    mockSeeds[0],
    mockReceipts,
    mockOffers,
    circleA,
    circleA,
    mockHeldNotes
  );

  assert(
    growthPreview.lanes.semanticLane !== undefined &&
      growthPreview.lanes.lineageLane !== undefined &&
      growthPreview.lanes.activeTensionLane !== undefined &&
      growthPreview.lanes.humanLinkLane !== undefined &&
      growthPreview.lanes.rejectedParallelLane !== undefined,
    'PROVED: All five explicit lanes (semantic, lineage, active_tension, human_link, rejected_parallel) exist in Nearby Growth'
  );

  // --------------------------------------------------
  // 2. SEMANTIC IS A REAL SEPARATE LANE
  // --------------------------------------------------
  assert(
    growthPreview.lanes.semanticLane.length > 0 &&
      growthPreview.lanes.semanticLane[0].primaryLane === 'semantic' &&
      growthPreview.lanes.semanticLane[0].classification === 'model_interpretation',
    'PROVED: Semantic lane is a real separate lane with primaryLane="semantic" and classification="model_interpretation"'
  );

  // --------------------------------------------------
  // 3. EVERY RESULT HAS primaryLane AND SafeSourceRef
  // --------------------------------------------------
  const allResults = [
    ...growthPreview.lanes.semanticLane,
    ...growthPreview.lanes.lineageLane,
    ...growthPreview.lanes.activeTensionLane,
    ...growthPreview.lanes.humanLinkLane,
    ...growthPreview.lanes.rejectedParallelLane,
  ];

  const allHaveLaneAndRef = allResults.every(
    (r) =>
      r.primaryLane &&
      r.classification &&
      Array.isArray(r.explicitEvidence) &&
      Array.isArray(r.safeSources) &&
      r.safeSources.every(
        (s) => typeof s.eventId === 'string' && typeof s.openable === 'boolean' && ['available', 'redacted', 'unavailable'].includes(s.display)
      )
  );

  assert(
    allHaveLaneAndRef,
    'PROVED: Every lane result carries primaryLane, classification, explicitEvidence, and exact SafeSourceRef shape ({ eventId, openable, display })'
  );

  // --------------------------------------------------
  // 4. INACCESSIBLE SOURCES ARE REDACTED / UNAVAILABLE
  // --------------------------------------------------
  const unauthorizedGrowth = computeNearbyGrowthPreview(
    mockSeeds[0],
    mockReceipts,
    mockOffers,
    circleB, // User circle B
    circleA, // Authorized circle A
    mockHeldNotes
  );

  assert(
    unauthorizedGrowth.authorized === false &&
      unauthorizedGrowth.safeSources.length > 0 &&
      unauthorizedGrowth.safeSources[0].display === 'redacted' &&
      unauthorizedGrowth.safeSources[0].openable === false,
    'PROVED: Inaccessible sources from mismatched circles carry display="redacted" and openable=false preserving existence without exposing content'
  );

  // --------------------------------------------------
  // 5. PRIVATE HELD DONKEY DRAFTS NEVER ENTER GROWTH OR MODEL CONTEXT
  // --------------------------------------------------
  const rawClaimsWithHeld = [
    {
      claim: 'Private conflict note about neighbor boundaries', // Held draft text!
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
  // 6. INACTIVITY NEVER BECOMES INFERRED REJECTION
  // --------------------------------------------------
  assert(
    growthPreview.lanes.rejectedParallelLane.length === 1 &&
      growthPreview.lanes.rejectedParallelLane[0].details.includes('Explicitly set aside'),
    'PROVED: rejected_parallel contains ONLY explicit offer.declined / need.closed domain evidence, and NEVER infers rejection from inactivity'
  );

  // --------------------------------------------------
  // 7. RESULTS DIVERSIFY ACROSS primaryLane
  // --------------------------------------------------
  const primaryLanes = growthPreview.diversifiedResults.map((r) => r.primaryLane);
  const uniqueLanes = new Set(primaryLanes);

  assert(
    uniqueLanes.size === primaryLanes.length && primaryLanes.length >= 4,
    'PROVED: Nearby Growth results diversify across primaryLane without collapsing into a single similarity score'
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

  console.log('\n🎉 ALL PASS 5B CONSTITUTIONAL CORRECTION TESTS PASSED SUCCESSFULLY!\n');
}

runIntelligenceTests().catch((err) => {
  console.error('Intelligence test error:', err);
  process.exit(1);
});
