import { DemoJubileeGateway } from './DemoJubileeGateway';
import { SupabaseJubileeGateway } from './SupabaseJubileeGateway';

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
  // Seed 1 (seed-1) has need n3 ('Printed care cards for kids') open
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
      supabaseMutationRes.error?.includes('Supabase authority plane is not connected'),
    'Unconfigured SupabaseGateway returns explicit safety error on mutation'
  );

  console.log('\n🎉 ALL PASS 1 VALIDATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
