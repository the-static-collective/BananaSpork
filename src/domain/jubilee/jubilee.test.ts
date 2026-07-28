import { DemoJubileeGateway } from './DemoJubileeGateway';
import { SupabaseJubileeGateway } from './SupabaseJubileeGateway';
import { envelopeFor, computeEventHash, verifyChain, type EventRow } from '../events';
import { canonicalJson } from '../canonical';
import { sha256Hex } from '../hashes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n========================================');
  console.log('  PASS 1: JUBILEE GATEWAY VALIDATION TESTS');
  console.log('========================================\n');

  // Test 1: DemoJubileeGateway runtime mode and state isolation
  const demoGateway = new DemoJubileeGateway({
    id: 'test-user',
    name: 'Test Member',
    role: 'Member',
  });

  assert(
    demoGateway.getRuntimeMode() === 'this_device_demo',
    'DemoJubileeGateway identifies as this_device_demo'
  );

  // Test 2: Invalid seed ID handling in pledge
  const pledgeInvalidSeedRes = await demoGateway.pledgeNeed('non-existent-seed-id', 'n1', 'Test Member');
  assert(
    pledgeInvalidSeedRes.success === false && pledgeInvalidSeedRes.error?.includes('Invalid Seed ID "non-existent-seed-id"'),
    'Pledging non-existent seed ID fails gracefully with visible error'
  );

  // Test 3: Invalid need ID handling in pledge
  const initialSeeds = await demoGateway.getSeeds();
  const validSeedId = initialSeeds[0].id;
  const pledgeInvalidNeedRes = await demoGateway.pledgeNeed(validSeedId, 'non-existent-need-id', 'Test Member');
  assert(
    pledgeInvalidNeedRes.success === false && pledgeInvalidNeedRes.error?.includes('Invalid Need ID "non-existent-need-id"'),
    'Pledging non-existent need ID fails gracefully with visible error'
  );

  // Test 4: Invalid seed/need ID in fulfillment confirmation
  const confirmInvalidRes = await demoGateway.confirmFulfillment('non-existent-seed-id', 'n1');
  assert(
    confirmInvalidRes.success === false && confirmInvalidRes.error?.includes('Invalid Seed ID "non-existent-seed-id"'),
    'Confirming non-existent seed ID fails gracefully with visible error'
  );

  // Test 5: Valid pledge & fulfillment flow
  const validPledgeRes = await demoGateway.pledgeNeed('seed-1', 'n3', 'Test Member');
  assert(validPledgeRes.success === true, 'Pledging open need on valid seed succeeds');

  const validConfirmRes = await demoGateway.confirmFulfillment('seed-1', 'n3');
  assert(validConfirmRes.success === true, 'Confirming pledged need succeeds');

  // Test 6: SupabaseJubileeGateway explicit safety boundaries
  const supabaseGateway = new SupabaseJubileeGateway({
    id: 'test-user',
    name: 'Test Member',
    role: 'Member',
  });

  assert(
    supabaseGateway.getRuntimeMode() === 'shared_campfire',
    'SupabaseJubileeGateway identifies as shared_campfire'
  );

  const supabaseMutationRes = await supabaseGateway.addOffer({
    title: 'Test Transport Offer',
    category: 'Transport',
    contributorName: 'Test Member',
    availability: 'Immediate',
    boundary: 'Local',
    icon: '🛻',
  });

  assert(
    supabaseMutationRes.success === false &&
      (supabaseMutationRes.error?.includes('Supabase authority plane is not connected') ||
       supabaseMutationRes.error?.includes('standalone offer is not supported')),
    'Standalone offer on SupabaseGateway returns explicit error'
  );

  console.log('\n========================================');
  console.log('  PASS 4: RPC & CANONICAL VERIFIER INVARIANTS');
  console.log('========================================\n');

  // Test 7: Repaired event envelope verification
  const testEvent: EventRow = {
    event_id: 'e0000000-0000-0000-0000-000000000000',
    circle_id: 'c0000000-0000-0000-0000-000000000000',
    sequence: 1,
    kind: 'need.opened',
    occurred_at: '2026-07-28T10:00:00.000Z',
    occurred_at_text: '2026-07-28T10:00:00.000Z',
    actor_user_id: 'u0000000-0000-0000-0000-000000000000',
    actor_label: 'Alice',
    actor_role: 'household',
    aggregate_id: 'a0000000-0000-0000-0000-000000000000',
    payload: { title: '🍌 Oatmeal Breakfast Box', targetUnits: 5 },
    previous_hash: 'GENESIS',
    event_hash: '',
  };

  testEvent.event_hash = computeEventHash(testEvent);
  const chainVerification = verifyChain([testEvent]);
  assert(chainVerification.ok === true, 'Repaired event envelope passes verifyChain');

  // Test 8: Non-BMP character SHA-256 canonical parity check
  const nonBmpString = '🍌 breakfast';
  const canonicalString = canonicalJson(nonBmpString);
  const nonBmpHash = sha256Hex(canonicalString);
  assert(canonicalString === '"🍌 breakfast"', 'Canonical JSON preserves non-BMP UTF-8 emoji string');
  assert(nonBmpHash.length === 64, 'SHA-256 hash of non-BMP Unicode string produces 64-char hex string');

  console.log('\n🎉 ALL JUBILEE VALIDATION AND PASS 4 TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
