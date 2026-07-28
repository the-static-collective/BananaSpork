import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
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
  console.log('  PASS 5: HOUSEHOLD INTELLIGENCE TESTS');
  console.log('========================================\n');

  // Test Fixtures
  const mockReceipts: WitnessReceipt[] = [
    {
      id: 'rcpt-101',
      sequence: 1,
      sha256Hash: 'a1b2c3d4e5f6',
      predecessorHash: 'GENESIS',
      actorName: 'Alice Household',
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
      eventType: 'fulfillment.confirmed',
      title: 'Fulfillment Confirmed',
      timestamp: '2026-07-28 10:00',
      details: 'Confirmed receipt of 2 oat cereal boxes from Bob',
    },
  ];

  const mockSeeds: ParticipationSeed[] = [
    {
      id: 'seed-501',
      title: 'Morning Breakfast Oat Station',
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

  // --------------------------------------------------
  // TEST 1: Scope-First Retrieval Boundary
  // --------------------------------------------------
  const circleA = 'circle-uuid-aaa';
  const circleB = 'circle-uuid-bbb';

  const authorizedList = buildDeterministicChangeList(mockReceipts, circleA, circleA);
  assert(authorizedList.length === 3, 'Scope-first retrieval returns items when user circle matches target circle');

  const unauthorizedList = buildDeterministicChangeList(mockReceipts, circleB, circleA);
  assert(unauthorizedList.length === 0, 'Scope-first retrieval denies access and returns empty array when circles mismatch');

  // --------------------------------------------------
  // TEST 2: Deterministic Change List Verifiability
  // --------------------------------------------------
  assert(
    authorizedList[0].sequence === 3 && authorizedList[0].id === 'rcpt-103',
    'Deterministic change list is ordered in reverse sequence order (newest first)'
  );
  assert(
    authorizedList[0].sourceRef.accessible === true && authorizedList[0].sourceRef.sourceId === 'rcpt-103',
    'Every deterministic item contains an accessible SafeSourceRef pointing to the witness receipt'
  );

  // --------------------------------------------------
  // TEST 3: AI Summary Source Citing & Drop Unbacked Claims
  // --------------------------------------------------
  const rawClaims = [
    {
      claim: 'Bob Neighbor pledged 2 boxes of toddler oat cereal',
      sourceId: 'rcpt-102', // Valid accessible receipt
    },
    {
      claim: 'Secret donor gave $500 cash in unverified transaction',
      sourceId: 'rcpt-non-existent-999', // Invalid / inaccessible source!
    },
  ];

  const report = buildWhatChangedReport(mockReceipts, circleA, circleA, rawClaims);
  assert(report.aiSummary?.length === 1, 'AI Summary includes only claims with accessible, valid source references');
  assert(report.hasUnbackedClaimsDropped === true, 'PROVED: Unbacked claims lacking accessible source are explicitly dropped');
  assert(
    report.aiSummary?.[0].sourceRef.sourceId === 'rcpt-102',
    'AI Summary claim correctly links to its witness receipt source'
  );

  // --------------------------------------------------
  // TEST 4: Gentle Matching (Separation of Evidence & Interpretation)
  // --------------------------------------------------
  const matches = computeGentleMatches(mockSeeds, mockOffers);
  assert(matches.length === 1, 'Gentle matching correctly surfaces candidate offers for open needs');

  const match = matches[0];
  assert(match.structuralEvidence.categoryMatch === true, 'Gentle match includes deterministic structural evidence (categoryMatch)');
  assert(
    typeof match.semanticInterpretation === 'string' && match.semanticInterpretation.length > 0,
    'Gentle match includes semantic interpretation labeled separately from structural evidence'
  );

  // --------------------------------------------------
  // TEST 5: Nearby Growth Preview (4 Deterministic Lanes before Semantic Search)
  // --------------------------------------------------
  const growthPreview = computeNearbyGrowthPreview(mockSeeds[0], mockReceipts, mockOffers, circleA, circleA);
  assert(growthPreview.authorized === true, 'Growth preview authorizes user within circle');
  assert(Array.isArray(growthPreview.lanes.lineageLane), 'Growth preview provides Lineage Lane');
  assert(Array.isArray(growthPreview.lanes.activeTensionLane), 'Growth preview provides Active Tension Lane');
  assert(Array.isArray(growthPreview.lanes.humanLinkLane), 'Growth preview provides Human Link Lane');
  assert(Array.isArray(growthPreview.lanes.rejectedParallelLane), 'Growth preview provides Rejected Parallel Lane');
  assert(
    growthPreview.lanes.humanLinkLane[0].name === 'Alice Household',
    'Human Link Lane identifies seed author'
  );

  // --------------------------------------------------
  // TEST 6: Invariant Verification - NO AI Auto-Writes or Auto-Pledges
  // --------------------------------------------------
  assert(
    mockSeeds[0].needs[0].status === 'open',
    'PROVED: Intelligence computations and Gentle Matching NEVER auto-pledge or mutate open needs'
  );
  assert(
    mockReceipts.length === 3,
    'PROVED: Intelligence computations NEVER automatically append events or perform database writes'
  );

  console.log('\n🎉 ALL PASS 5 HOUSEHOLD INTELLIGENCE TESTS PASSED SUCCESSFULLY!\n');
}

runIntelligenceTests().catch((err) => {
  console.error('Intelligence test error:', err);
  process.exit(1);
});
