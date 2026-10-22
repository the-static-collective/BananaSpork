import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  circulationDigest, prepareCirculationInput, CirculationLocalInbox, CIRCULATION_INPUT_SCHEMA,
  CIRCULATION_STORE_KEY, type CirculationStorage,
} from './circulation002';
import { admitHelpSlipCarrier } from '../help-slip/envelope';

const putId = (prefix: string, record: Record<string, unknown>) => ({
  ...record, id: prefix + circulationDigest('', record).slice(7),
});
function fixture() {
  const src = putId('fgs:', {
    source_class: 'conversation-witness', authority: 'none',
    locator: { system: 'CANNON synthetic fixture', coordinate: 'circulation001/seed.json', revision: 'v0', resolution: 'fixture-only' },
    digest: circulationDigest('', 'FICTIONAL: one source'), access: 'public', export: 'portable',
    excerpt: 'FICTIONAL: only a deterministic rehearsal; no person or partner asserted',
  });
  const node = (kind: string, label: string, status: string, extensions: Record<string, unknown>) =>
    putId('fgn:', { kind, label, status, source_ids: [src.id], extensions });
  const seed = node('question', 'FICTIONAL: surplus vegetables?', 'proposed', { circulation_role: 'seed' });
  const care = { destination: 'the-static-collective/BananaSpork', lane: 'care',
    question: 'FICTIONAL: could a steward inspect a help-slip proposal?' };
  const culture = { destination: 'the-static-collective/static-live', lane: 'culture',
    question: 'FICTIONAL: might a songwriter consider a harvest song?' };
  const all = [care, culture];
  const nodes: Array<Record<string, unknown>> = [seed];
  const links: Array<Record<string, unknown>> = [];
  const inviteNodes = [];
  const link = (a: string, b: string) => putId('fgl:', {
    from: a, to: b, verb: 'connects', qualifier: 'possible invitation only; no permission',
    status: 'proposed', source_ids: [src.id], authority: 'none',
  });
  for (const r of all) {
    const address = node('world', r.destination, 'observed', { circulation_role: 'receiver-address-only' });
    const invite = node('question', r.question, 'proposed', {
      circulation_role: 'invitation', origin_seed: seed.id, destination: r.destination, lane: r.lane,
    });
    nodes.push(address, invite);
    inviteNodes.push({ invite, ...r });
    links.push(link(seed.id, invite.id), link(invite.id, address.id));
  }
  const graph = {
    schema: 'free-graph.packet/v0', purpose: 'simulated',
    modes: ['seed'], scope: { task: 'test', worlds: [care.destination, culture.destination] },
    task_world_cut: { status: 'sufficient', selected_ids: [seed.id], owner_head_source_ids: [], omitted: [], rationale: 'test' },
    sources: [src], nodes, links, residual_fog: [], non_imports: [],
    extensions: { origin: 'cannon.circulation001', synthetic_only: true, circulation_fixture: true },
  };
  const graphWithId = { ...graph, packet_id: 'fgp:' + circulationDigest('', graph).slice(7) };
  const offers = inviteNodes.map(({ invite, destination, lane, question }) => {
    const o = {
      destination, lane, graph_invitation_node: invite.id, seed_node: seed.id, question,
      status: 'PROPOSED_ONLY', owner_response: 'NONE', authorized_execution: false,
      publication: false, gate: 'RECIPIENT_PROJECT_OWNER_EXPLICIT_REVIEW',
    };
    return { id: circulationDigest('CIRCULATION001-OFFER|', o), ...o };
  });
  const body = {
    schema: 'planz.circulation-offer-set/v0', graph_packet_id: graphWithId.packet_id,
    seed_node: seed.id, offers, selection: 'NO_AUTOMATIC_RECIPIENT_ADMISSION',
    execution: 'NONE', real_human_permissions: 'NOT_COLLECTED',
  };
  return { schema: CIRCULATION_INPUT_SCHEMA, source_graph: graphWithId,
    offer_set: { id: circulationDigest('CIRCULATION001-SET|', body), ...body } };
}
const deep = <T>(a: T): T => JSON.parse(JSON.stringify(a)) as T;
class Storage implements CirculationStorage {
  readonly map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}
const prepared = (v: unknown) => {
  const result = prepareCirculationInput(JSON.stringify(v));
  assert.equal(result.disposition, 'prepared', JSON.stringify(result));
  if (result.disposition !== 'prepared') throw Error('NOT_PREPARED');
  return result;
};
const refuse = (v: unknown) => {
  const result = prepareCirculationInput(JSON.stringify(v));
  assert.equal(result.disposition, 'refused', JSON.stringify(result));
};

test('proposed native graph and planZ offer are source-bound, but not a Help Slip', () => {
  const packet = fixture();
  const res = prepared(packet);
  assert.equal(res.destination, 'the-static-collective/BananaSpork');
  assert.equal(res.lane, 'care');
  assert.equal(res.storageEffect, 'NONE_UNTIL_EXPLICIT_LOCAL_CHOICE');
  assert.equal(admitHelpSlipCarrier(JSON.stringify(packet)).disposition, 'refused');
  assert.ok(res.question.startsWith('FICTIONAL:'));
});

test('independently local review and HOLD with native storage, restart, duplicate, explicit release', () => {
  const db = new Storage();
  const first = new CirculationLocalInbox(db);
  const proposed = prepared(fixture());
  assert.equal(first.list().length, 0);
  assert.throws(() => first.choose(proposed, 'HOLD_LOCAL', false), /EXPLICIT_LOCAL_REVIEW_REQUIRED/);
  assert.equal(db.getItem(CIRCULATION_STORE_KEY), null);
  const hold = first.choose(proposed, 'HOLD_LOCAL', true);
  assert.equal(hold.reply.choice, 'HOLD_LOCAL');
  assert.equal(hold.reply.externalEffect, 'NONE');
  assert.equal(hold.reply.helpSlipCreated, false);
  assert.equal(hold.reply.campfirePublished, false);
  assert.equal(hold.reply.fulfillmentConfirmed, false);
  assert.equal(new CirculationLocalInbox(db).list().length, 1);
  assert.deepEqual(first.choose(proposed, 'HOLD_LOCAL', true), hold);
  assert.equal(first.list().length, 1);
  assert.throws(() => first.choose(proposed, 'DECLINE_LOCAL', true), /CONFLICT/);
  assert.throws(() => first.releaseUnshared(proposed.offerId, false), /EXPLICIT_LOCAL_RELEASE_REQUIRED/);
  assert.equal(first.releaseUnshared(proposed.offerId, true), true);
  assert.equal(new CirculationLocalInbox(db).list().length, 0);
  assert.equal(first.releaseUnshared(proposed.offerId, true), false);
});

test('DECLINE only returns a local unverified response; not a human attestment or original graph mutation', () => {
  const p = fixture();
  const frozen = JSON.stringify(p);
  const offer = prepared(p);
  const db = new Storage();
  const choice = new CirculationLocalInbox(db).choose(offer, 'DECLINE_LOCAL', true);
  assert.equal(choice.reply.choice, 'DECLINE_LOCAL');
  assert.equal(choice.reply.ownerIdentityAuthenticated, false);
  assert.equal(choice.reply.humanConsentProven, false);
  assert.equal(JSON.stringify(p), frozen);
});

test('refuse changed source pin, graph identity, graph link, destination, copied culture lane', () => {
  let x = fixture(); x.source_graph.nodes[0].label = 'FICTIONAL: altered'; refuse(x);
  x = fixture(); x.source_graph.packet_id = 'fgp:sha256:' + 'a'.repeat(64); refuse(x);
  x = fixture(); x.source_graph.links[0].authority = 'owner-local'; refuse(x);
  x = fixture(); x.offer_set.offers[0].destination = 'the-static-collective/Other'; refuse(x);
  x = fixture(); x.offer_set.offers[0].lane = 'culture'; refuse(x);
  x = fixture(); x.source_graph.nodes[1].status = 'locally-adopted'; refuse(x);
});

test('refuse implied activity, credential fields, person identifiers and promoted rights', () => {
  let x = fixture(); x.offer_set.offers[0].authorized_execution = true; refuse(x);
  x = fixture(); x.offer_set.offers[0].owner_response = 'ACCEPTED'; refuse(x);
  x = fixture(); (x.offer_set as unknown as Record<string, unknown>).authenticated = true; refuse(x);
  x = fixture(); x.source_graph.nodes[0].label = 'FICTIONAL: ask jane@example.org'; refuse(x);
  x = fixture(); x.source_graph.nodes[0].label = 'FICTIONAL: call 555-123-4444'; refuse(x);
  x = fixture(); x.source_graph.extensions.synthetic_only = false; refuse(x);
});

test('untrusted local store mutation refuses forged publication and changed receipt hash', () => {
  const db = new Storage();
  const inbox = new CirculationLocalInbox(db);
  inbox.choose(prepared(fixture()), 'HOLD_LOCAL', true);
  let held = JSON.parse(db.getItem(CIRCULATION_STORE_KEY)!) as Array<{reply: Record<string, unknown>}>;
  held[0].reply.campfirePublished = true;
  db.setItem(CIRCULATION_STORE_KEY, JSON.stringify(held));
  assert.throws(() => inbox.list(), /CIRCULATION_LOCAL_STORE_INVALID/);
  held[0].reply.campfirePublished = false;
  held[0].reply.id = 'sha256:' + '0'.repeat(64);
  db.setItem(CIRCULATION_STORE_KEY, JSON.stringify(held));
  assert.throws(() => inbox.list(), /CIRCULATION_LOCAL_STORE_INVALID/);
});

test('cold real CANNON / Free Graph / planZ source artifact is accepted when supplied by CI', () => {
  const file = process.env.CIRCULATION_INPUT_FIXTURE;
  if (!file) return; // cross-project CI sets this; isolated npm test uses constructed fixture above
  const result = prepareCirculationInput(readFileSync(file, 'utf8'));
  assert.equal(result.disposition, 'prepared', JSON.stringify(result));
  if (result.disposition !== 'prepared') return;
  const db = new Storage();
  const record = new CirculationLocalInbox(db).choose(result, 'HOLD_LOCAL', true);
  assert.equal(record.reply.sourceGraphPacketId, result.graphId);
  assert.equal(record.reply.offerSetId, result.offerSetId);
  assert.equal(record.reply.helpSlipCreated, false);
});
