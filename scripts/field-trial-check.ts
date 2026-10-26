/**
 * FIELD-SPECIMEN-002 · local-only operator checklist evaluator.
 * Reads a local JSON file; does not talk to Supabase or transmit its contents.
 * Never treats a self-entered checkbox as authenticated source proof.
 *
 * npm run field:check -- docs/fixtures/field-trial-example.json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assessFieldTrial, type LocalFieldTrial } from '../src/domain/field-proof/fieldProof';

const path = process.argv[2];
if (!path || path === '--help' || path === '-h') {
  console.log('Usage: npm run field:check -- <local-field-trial.json>');
  console.log('Evaluates locally, prints ONLY evidence states and unresolved gates.');
  console.log('Do not include passwords, account identifiers, raw messages, contact details, or beneficiary histories.');
  process.exit(path ? 0 : 2);
}
try {
  const input = JSON.parse(readFileSync(resolve(path), 'utf8')) as LocalFieldTrial;
  const review = assessFieldTrial(input);
  console.log(JSON.stringify(review, null, 2));
  if (review.standing === 'BLOCKED') process.exitCode = 1;
} catch (e) {
  console.error('Could not assess field specimen:', e instanceof Error ? e.message : 'UNKNOWN_ERROR');
  process.exitCode = 1;
}
