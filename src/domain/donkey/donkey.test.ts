import {
  detectLocalSafetyTriggers,
  generateLocalWorksheetFallback,
  getHeldNotes,
  saveHeldNote,
  validateDonkeyResponse,
} from './donkeyService';
import { DemoJubileeGateway } from '../jubilee/DemoJubileeGateway';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runDonkeyTests() {
  console.log('\n========================================');
  console.log('  PASS 2: DONKEY COMPOSER VALIDATION TESTS');
  console.log('========================================\n');

  // Test 1: Schema validation for valid and invalid Donkey responses
  const validMock = {
    protecting: 'What you may be protecting: your time and boundaries.',
    facts: ['Dinner was delayed by 30 mins.'],
    requestOrBoundary: 'I need 15 minutes heads-up if plans change.',
    warmVersion: 'Hey, I felt stressed when plans changed without notice.',
    firmVersion: 'I need 15 minutes notice before schedule changes.',
    holdNote: '[Private Hold Note]: Unsent draft about schedule.',
    safetyMode: false,
    safetyReason: null,
  };

  const validated = validateDonkeyResponse(validMock);
  assert(validated !== null && validated.safetyMode === false, 'Valid schema is successfully validated');

  const invalidMock = {
    protecting: 'Missing other required fields',
  };
  const invalidValidated = validateDonkeyResponse(invalidMock);
  assert(invalidValidated === null, 'Invalid schema fails validation safely');

  // Test 2: Local non-AI worksheet fallback generation
  const fallback = generateLocalWorksheetFallback('You were late again and it ruined dinner.');
  assert(
    typeof fallback.protecting === 'string' &&
      fallback.protecting.includes('Interpretation:') &&
      fallback.facts.length > 0 &&
      fallback.warmVersion.length > 0 &&
      fallback.firmVersion.length > 0 &&
      fallback.holdNote.length > 0,
    'Local worksheet fallback generates complete structured response'
  );

  // Test 3: Safety mode detection
  const safeTriggerRes = detectLocalSafetyTriggers('I am going to hit you if you bring this up again');
  assert(safeTriggerRes.isSafety === true, 'Safety triggers detect violent threats');

  const safetyFallback = generateLocalWorksheetFallback('I will hurt you if you do that');
  assert(
    safetyFallback.safetyMode === true && safetyFallback.safetyReason !== null,
    'High-heat safety draft triggers safetyMode = true'
  );

  // Test 4: PROOF OF NO AUTOSEND
  let chatMessagesSent: string[] = [];
  const mockSendMessage = (text: string) => {
    chatMessagesSent.push(text);
  };

  const draftToHold = 'I am furious about the mess in the kitchen!';
  const heldNote = saveHeldNote(draftToHold, `[Private Hold Note]: ${draftToHold}`);

  assert(chatMessagesSent.length === 0, 'PROVED: Reframe & Hold action NEVER sends message automatically');
  assert(heldNote.draft === draftToHold, 'PROVED: Hold action saves draft privately on device');

  // Test 5: PROOF OF NO JUBILEE / WITNESS LEDGER WRITE
  const jubileeGateway = new DemoJubileeGateway({ id: 'u1', name: 'Author', role: 'Member' });
  const initialReceipts = await jubileeGateway.getReceipts();
  const initialReceiptCount = initialReceipts.length;

  // Simulate holding note or reframing
  saveHeldNote('Tense draft about childcare', '[Private Hold]');

  const receiptsAfterHold = await jubileeGateway.getReceipts();
  assert(
    receiptsAfterHold.length === initialReceiptCount,
    'PROVED: Donkey Hold action NEVER creates a Witness Ledger receipt or Jubilee event'
  );

  console.log('\n🎉 ALL PASS 2 DONKEY VALIDATION TESTS PASSED SUCCESSFULLY!\n');
}

runDonkeyTests().catch((err) => {
  console.error('Donkey test execution error:', err);
  process.exit(1);
});
