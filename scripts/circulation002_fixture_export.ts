#!/usr/bin/env node
/**
 * CI/fixture emission ONLY: exercises the native BananaSpork local inbox with
 * a source-generated CANNON/planZ package. The "human reviewed" gate is
 * SIMULATED HERE ONLY, and cannot establish real human involvement.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { CirculationLocalInbox, prepareCirculationInput, type CirculationStorage } from '../src/domain/circulation/circulation002';

if (process.env.CIRCULATION_SIMULATION_ONLY !== 'YES_FIXTURE_ONLY' ||
    process.argv.length !== 4) {
  throw Error('SIMULATION_ONLY: CIRCULATION_SIMULATION_ONLY=YES_FIXTURE_ONLY node ... input.json output.json');
}
const [source, destination] = process.argv.slice(2);
const admission = prepareCirculationInput(readFileSync(source, 'utf8'));
if (admission.disposition !== 'prepared') throw Error('NATIVE_BANANASPORK_REFUSED:' + admission.reason);
const memory = new Map<string, string>();
const storage: CirculationStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, v); },
  removeItem: (k) => { memory.delete(k); },
};
const inbox = new CirculationLocalInbox(storage);
const answer = inbox.choose(admission, 'HOLD_LOCAL', true /* automated simulated fixture action only */);
if (inbox.list().length !== 1) throw Error('SIMULATED_INBOX_DID_NOT_RETAIN_REPLY');
if (answer.reply.helpSlipCreated || answer.reply.campfirePublished || answer.reply.ownerIdentityAuthenticated) {
  throw Error('INHERITED_UNLAWFUL_AUTHORITY');
}
writeFileSync(destination, JSON.stringify(answer.reply, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({
  status: 'SIMULATED_RECEIVER_LOCAL_ONLY',
  source_graph: admission.graphId,
  local_reply: answer.reply.id,
  human_authenticated: false,
  help_slip_created: false,
  transmitted: false,
}));
