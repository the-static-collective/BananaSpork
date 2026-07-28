import { createClient } from '@supabase/supabase-js';
import { canonicalJson } from '../src/domain/canonical';
import { sha256Hex } from '../src/domain/hashes';
import { FIXTURES } from '../tests/canonical-fixtures';

async function verifyParity() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log('Skipping live DB parity check: SUPABASE_URL / SUPABASE_ANON_KEY not set in env.');
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const email = `parity_${Date.now()}_${Math.random().toString(36).slice(2)}@example.test`;
  const password = 'parity-Test-123!';
  const { error: e1 } = await supabase.auth.signUp({ email, password });
  if (e1 && !/registered/i.test(e1.message)) {
    console.error('signUp failed:', e1.message);
    return;
  }
  const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
  if (e2) {
    console.error('signIn failed:', e2.message);
    return;
  }

  let failures = 0;
  for (const f of FIXTURES) {
    const tsCanon = canonicalJson(f.input);
    const tsHash = sha256Hex(tsCanon);
    const { data, error } = await supabase.rpc('debug_canonical_hash' as any, { v: f.input as any });
    if (error) {
      console.error(`x ${f.name}: rpc error ${error.message}`);
      failures++;
      continue;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const pgCanon = row?.canonical;
    const pgHash = row?.hash;
    if (pgCanon !== tsCanon || pgHash !== tsHash) {
      failures++;
      console.error(`x ${f.name}`);
      console.error(`  TS  canon: ${JSON.stringify(tsCanon)}`);
      console.error(`  PG  canon: ${JSON.stringify(pgCanon)}`);
      console.error(`  TS  hash : ${tsHash}`);
      console.error(`  PG  hash : ${pgHash}`);
    } else {
      console.log(`v ${f.name}  ${tsHash.slice(0, 12)}...`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} fixture(s) failed parity.`);
    process.exit(1);
  }
  console.log(`\nAll ${FIXTURES.length} fixtures parity-verified TS <-> Postgres.`);
}

verifyParity().catch((err) => {
  console.error('Parity verification error:', err);
  process.exit(1);
});
