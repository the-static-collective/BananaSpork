/**
 * CIRCULATION-002: real BananaSpork-native *local proposal receiver*.
 * Deliberately separate from Help Slips, Campfire, and PENNY obligations.
 * The only accepted specimen is a CANNON synthetic graph + planZ offer-set.
 */
import { sha256Hex } from '../hashes';

export const CIRCULATION_INPUT_SCHEMA = 'banana-spork.circulation-input/v0';
export const CIRCULATION_REPLY_SCHEMA = 'banana-spork.circulation-local-reply/v0';
const DESTINATION = 'the-static-collective/BananaSpork';
const SHA = /^sha256:[0-9a-f]{64}$/;
const FGS = /^fgs:sha256:[0-9a-f]{64}$/;
const FGN = /^fgn:sha256:[0-9a-f]{64}$/;
const FGL = /^fgl:sha256:[0-9a-f]{64}$/;
const FGP = /^fgp:sha256:[0-9a-f]{64}$/;
const privateShape = /@|https?:\/\/|[0-9]{3}[-. ][0-9]{3}[-. ][0-9]{4}/i;

type JsonRecord = Record<string, unknown>;
export type CirculationChoice = 'HOLD_LOCAL' | 'DECLINE_LOCAL';
export interface PreparedCirculation {
  disposition: 'prepared';
  graphId: string;
  offerSetId: string;
  offerId: string;
  seedId: string;
  sourceQuestion: string;
  question: string;
  destination: typeof DESTINATION;
  lane: 'care';
  unverifiedFixture: true;
  storageEffect: 'NONE_UNTIL_EXPLICIT_LOCAL_CHOICE';
}
export type CirculationAdmission =
  | PreparedCirculation
  | { disposition: 'refused'; reason: string };

export interface CirculationLocalReply {
  id: string;
  schema: typeof CIRCULATION_REPLY_SCHEMA;
  sourceGraphPacketId: string;
  offerSetId: string;
  offerId: string;
  destination: typeof DESTINATION;
  lane: 'care';
  choice: CirculationChoice;
  evidenceClass: 'LOCAL_USER_SELECTION_UNAUTHENTICATED';
  sourceStatus: 'FICTIONAL_UNVERIFIED';
  externalEffect: 'NONE';
  helperAssigned: false;
  helpSlipCreated: false;
  campfirePublished: false;
  ownerIdentityAuthenticated: false;
  fulfillmentConfirmed: false;
  humanConsentProven: false;
}
export interface CirculationLocalRecord {
  reply: CirculationLocalReply;
  seedQuestion: string;
  invitationQuestion: string;
}
function record(v: unknown): v is JsonRecord {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function keys(v: JsonRecord, required: readonly string[]): boolean {
  return Object.keys(v).length === required.length &&
    required.every((k) => Object.prototype.hasOwnProperty.call(v, k));
}
function text(v: unknown, max = 220): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max &&
    v.trim() === v && !/[\u0000-\u001f\u007f]/.test(v) && !privateShape.test(v);
}
function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (record(value)) return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  throw new Error('CIRCULATION_UNSUPPORTED_CANONICAL_VALUE');
}
export function circulationDigest(domain: string, value: unknown): string {
  return 'sha256:' + sha256Hex(domain + canonical(value));
}
function stripped(v: JsonRecord, key: string): JsonRecord {
  const result = { ...v };
  delete result[key];
  return result;
}
function graphIdMatches(graph: JsonRecord): boolean {
  if (typeof graph.packet_id !== 'string' || !FGP.test(graph.packet_id)) return false;
  if (circulationDigest('', stripped(graph, 'packet_id')) !== graph.packet_id.replace(/^fgp:/, '')) return false;
  for (const [family, prefix] of [['sources', 'fgs'], ['nodes', 'fgn'], ['links', 'fgl']] as const) {
    if (!Array.isArray(graph[family])) return false;
    for (const entry of graph[family]) {
      if (!record(entry)) return false;
      const id = entry.id;
      const pattern = prefix === 'fgs' ? FGS : prefix === 'fgn' ? FGN : FGL;
      if (typeof id !== 'string' || !pattern.test(id) ||
          circulationDigest('', stripped(entry, 'id')) !== id.replace(prefix + ':', '')) return false;
    }
  }
  return true;
}

/** Source/offer address validation is local and fail-closed; it does not
 * authenticate any human and is not a substitute for Free Graph native schema validation. */
export function prepareCirculationInput(raw: string): CirculationAdmission {
  if (raw.length === 0 || raw.length > 85000) return { disposition: 'refused', reason: 'BOUNDED_JSON_REQUIRED' };
  let input: unknown;
  try { input = JSON.parse(raw); }
  catch { return { disposition: 'refused', reason: 'INVALID_JSON' }; }
  if (!record(input) || !keys(input, ['schema', 'source_graph', 'offer_set']) ||
      input.schema !== CIRCULATION_INPUT_SCHEMA ||
      !record(input.source_graph) || !record(input.offer_set)) {
    return { disposition: 'refused', reason: 'INVALID_INPUT_SCHEMA' };
  }
  const graph = input.source_graph;
  const set = input.offer_set;
  if (graph.schema !== 'free-graph.packet/v0' || !graphIdMatches(graph) ||
      !record(graph.extensions) ||
      !keys(graph.extensions, ['origin', 'synthetic_only', 'circulation_fixture']) ||
      graph.extensions.origin !== 'cannon.circulation001' ||
      graph.extensions.synthetic_only !== true ||
      graph.extensions.circulation_fixture !== true ||
      !Array.isArray(graph.modes) || graph.modes.length !== 1 || graph.modes[0] !== 'seed' ||
      !Array.isArray(graph.sources) || graph.sources.length !== 1 ||
      !Array.isArray(graph.nodes) || graph.nodes.length !== 5 ||
      !Array.isArray(graph.links) || graph.links.length !== 4) {
    return { disposition: 'refused', reason: 'SOURCE_GRAPH_NOT_VALIDATED_FIXTURE' };
  }
  const src = graph.sources[0] as JsonRecord;
  if (src.source_class !== 'conversation-witness' || src.authority !== 'none' ||
      src.access !== 'public' || src.export !== 'portable' ||
      !text(src.excerpt) || !(src.excerpt as string).startsWith('FICTIONAL:')) {
    return { disposition: 'refused', reason: 'SOURCE_RIGHTS_OR_PRIVACY_UNVERIFIED' };
  }
  const nodes = graph.nodes as JsonRecord[];
  const sources = new Set([src.id]);
  const seeds = nodes.filter((n) => record(n.extensions) && n.extensions.circulation_role === 'seed');
  const invitations = nodes.filter((n) => record(n.extensions) && n.extensions.circulation_role === 'invitation');
  const addresses = nodes.filter((n) => record(n.extensions) && n.extensions.circulation_role === 'receiver-address-only');
  if (seeds.length !== 1 || invitations.length !== 2 || addresses.length !== 2 ||
      !nodes.every((n) => Array.isArray(n.source_ids) && n.source_ids.length === 1 &&
                    sources.has(n.source_ids[0]) && text(n.label, 180) &&
                    ['observed', 'proposed'].includes(String(n.status))) ||
      !text(seeds[0].label, 180) || !(seeds[0].label as string).startsWith('FICTIONAL:') ||
      seeds[0].kind !== 'question' || seeds[0].status !== 'proposed') {
    return { disposition: 'refused', reason: 'GRAPH_RELATIONS_UNSAFE' };
  }
  const seed = seeds[0];
  const addressNames = addresses.map((n) => n.label);
  const lanes = invitations.map((n) => record(n.extensions) ? n.extensions.lane : null);
  if (new Set(addressNames).size !== 2 || !addressNames.includes(DESTINATION) ||
      new Set(lanes).size !== 2 || !lanes.includes('care') || !lanes.includes('culture') ||
      !addresses.every((n) => n.kind === 'world' && n.status === 'observed' &&
        record(n.extensions) && keys(n.extensions, ['circulation_role'])) ||
      !invitations.every((n) => record(n.extensions) &&
        keys(n.extensions, ['circulation_role', 'origin_seed', 'destination', 'lane']) &&
        n.kind === 'question' && n.status === 'proposed' &&
        n.extensions.origin_seed === seed.id &&
        addressNames.includes(n.extensions.destination) &&
        text(n.label, 180) && (n.label as string).startsWith('FICTIONAL:'))) {
    return { disposition: 'refused', reason: 'GRAPH_RELATIONS_UNSAFE' };
  }
  const ids = new Set<string>();
  for (const link of graph.links as JsonRecord[]) {
    if (!keys(link, ['id', 'from', 'verb', 'to', 'qualifier', 'status', 'source_ids', 'authority']) ||
        link.verb !== 'connects' || link.status !== 'proposed' || link.authority !== 'none' ||
        !Array.isArray(link.source_ids) || link.source_ids.length !== 1 ||
        !sources.has(link.source_ids[0]) ||
        !text(link.qualifier, 180)) return { disposition: 'refused', reason: 'GRAPH_LINKS_UNSAFE' };
    ids.add(String(link.from) + '>' + String(link.to));
  }
  if (ids.size !== 4 || !invitations.every((n) => {
    const world = addresses.find((a) => a.label === (n.extensions as JsonRecord).destination);
    return world && ids.has(seed.id + '>' + n.id) && ids.has(n.id + '>' + world.id);
  })) return { disposition: 'refused', reason: 'GRAPH_LINKS_UNSAFE' };
  if (!keys(set, ['id', 'schema', 'graph_packet_id', 'seed_node', 'offers', 'selection', 'execution', 'real_human_permissions']) ||
      set.schema !== 'planz.circulation-offer-set/v0' ||
      set.graph_packet_id !== graph.packet_id || set.seed_node !== seed.id ||
      set.selection !== 'NO_AUTOMATIC_RECIPIENT_ADMISSION' || set.execution !== 'NONE' ||
      set.real_human_permissions !== 'NOT_COLLECTED' ||
      !Array.isArray(set.offers) || set.offers.length !== 2 ||
      typeof set.id !== 'string' || !SHA.test(set.id) ||
      set.id !== circulationDigest('CIRCULATION001-SET|', stripped(set, 'id'))) {
    return { disposition: 'refused', reason: 'PLANZ_SET_INVALID' };
  }
  const seen = new Set<string>();
  for (const offer of set.offers) {
    if (!record(offer) ||
        !keys(offer, ['id', 'destination', 'lane', 'graph_invitation_node', 'seed_node', 'question', 'status', 'owner_response', 'authorized_execution', 'publication', 'gate']) ||
        typeof offer.id !== 'string' || offer.id !== circulationDigest('CIRCULATION001-OFFER|', stripped(offer, 'id')) ||
        offer.seed_node !== seed.id || offer.status !== 'PROPOSED_ONLY' ||
        offer.owner_response !== 'NONE' || offer.authorized_execution !== false ||
        offer.publication !== false || offer.gate !== 'RECIPIENT_PROJECT_OWNER_EXPLICIT_REVIEW' ||
        !text(offer.question, 180)) return { disposition: 'refused', reason: 'PLANZ_OFFER_INVALID' };
    const invite = invitations.find((n) => n.id === offer.graph_invitation_node);
    if (!invite || !record(invite.extensions) || offer.destination !== invite.extensions.destination ||
        offer.lane !== invite.extensions.lane || offer.question !== invite.label ||
        seen.has(offer.destination as string)) return { disposition: 'refused', reason: 'PLANZ_CROSSING_MISMATCH' };
    seen.add(offer.destination as string);
  }
  if (seen.size !== 2) return { disposition: 'refused', reason: 'PLANZ_CROSSING_MISMATCH' };
  const care = (set.offers as JsonRecord[]).find((o) => o.destination === DESTINATION);
  if (!care || care.lane !== 'care' || typeof care.id !== 'string' ||
      typeof graph.packet_id !== 'string' || typeof set.id !== 'string' ||
      typeof seed.id !== 'string' || typeof seed.label !== 'string' || typeof care.question !== 'string') {
    return { disposition: 'refused', reason: 'BANANASPORK_NOT_INVITED' };
  }
  return {
    disposition: 'prepared', graphId: graph.packet_id, offerSetId: set.id,
    offerId: care.id, seedId: seed.id, sourceQuestion: seed.label,
    question: care.question, destination: DESTINATION, lane: 'care',
    unverifiedFixture: true, storageEffect: 'NONE_UNTIL_EXPLICIT_LOCAL_CHOICE',
  };
}

export function makeLocalCirculationReply(
  prepared: PreparedCirculation, choice: CirculationChoice
): CirculationLocalReply {
  if (!['HOLD_LOCAL', 'DECLINE_LOCAL'].includes(choice)) throw Error('UNSUPPORTED_CIRCULATION_CHOICE');
  const body = {
    schema: CIRCULATION_REPLY_SCHEMA,
    sourceGraphPacketId: prepared.graphId,
    offerSetId: prepared.offerSetId,
    offerId: prepared.offerId,
    destination: DESTINATION,
    lane: 'care' as const,
    choice,
    evidenceClass: 'LOCAL_USER_SELECTION_UNAUTHENTICATED' as const,
    sourceStatus: 'FICTIONAL_UNVERIFIED' as const,
    externalEffect: 'NONE' as const,
    helperAssigned: false as const,
    helpSlipCreated: false as const,
    campfirePublished: false as const,
    ownerIdentityAuthenticated: false as const,
    fulfillmentConfirmed: false as const,
    humanConsentProven: false as const,
  } as const;
  return { id: circulationDigest('BANANASPORK-CIRCULATION-002|', body), ...body };
}

export const CIRCULATION_STORE_KEY = 'banana-spork-circulation-local-v0';
export interface CirculationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const fallbackMemory = new Map<string, string>();
const fallbackStorage: CirculationStorage = {
  getItem: (k) => fallbackMemory.get(k) ?? null,
  setItem: (k, v) => { fallbackMemory.set(k, v); },
  removeItem: (k) => { fallbackMemory.delete(k); },
};
function defaultStorage(): CirculationStorage {
  try { if (typeof localStorage !== 'undefined') return localStorage; }
  catch { /* local, volatile fallback */ }
  return fallbackStorage;
}
export class CirculationLocalInbox {
  constructor(private readonly storage: CirculationStorage = defaultStorage()) {}
  list(): CirculationLocalRecord[] {
    const raw = this.storage.getItem(CIRCULATION_STORE_KEY);
    if (raw === null) return [];
    if (raw.length > 30000) throw Error('CIRCULATION_LOCAL_STORE_INVALID');
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw Error('CIRCULATION_LOCAL_STORE_INVALID'); }
    if (!Array.isArray(parsed) || parsed.length > 16) throw Error('CIRCULATION_LOCAL_STORE_INVALID');
    const seen = new Set<string>();
    return parsed.map((value: unknown) => {
      if (!record(value) || !keys(value, ['reply', 'seedQuestion', 'invitationQuestion']) ||
          !record(value.reply) || !text(value.seedQuestion, 180) ||
          !text(value.invitationQuestion, 180) ||
          !(value.seedQuestion as string).startsWith('FICTIONAL:') ||
          !(value.invitationQuestion as string).startsWith('FICTIONAL:')) throw Error('CIRCULATION_LOCAL_STORE_INVALID');
      const rep = value.reply as JsonRecord;
      if (!keys(rep, ['id', 'schema', 'sourceGraphPacketId', 'offerSetId', 'offerId',
        'destination', 'lane', 'choice', 'evidenceClass', 'sourceStatus', 'externalEffect',
        'helperAssigned', 'helpSlipCreated', 'campfirePublished', 'ownerIdentityAuthenticated',
        'fulfillmentConfirmed', 'humanConsentProven']) ||
        rep.schema !== CIRCULATION_REPLY_SCHEMA || !FGP.test(String(rep.sourceGraphPacketId)) ||
        !SHA.test(String(rep.offerSetId)) || !SHA.test(String(rep.offerId)) ||
        rep.destination !== DESTINATION || rep.lane !== 'care' ||
        !['HOLD_LOCAL', 'DECLINE_LOCAL'].includes(String(rep.choice)) ||
        rep.evidenceClass !== 'LOCAL_USER_SELECTION_UNAUTHENTICATED' ||
        rep.sourceStatus !== 'FICTIONAL_UNVERIFIED' || rep.externalEffect !== 'NONE' ||
        ['helperAssigned', 'helpSlipCreated', 'campfirePublished', 'ownerIdentityAuthenticated',
         'fulfillmentConfirmed', 'humanConsentProven'].some((k) => rep[k] !== false) ||
        rep.id !== circulationDigest('BANANASPORK-CIRCULATION-002|', stripped(rep, 'id')) ||
        seen.has(rep.offerId as string)) throw Error('CIRCULATION_LOCAL_STORE_INVALID');
      seen.add(rep.offerId as string);
      return value as unknown as CirculationLocalRecord;
    });
  }
  choose(prepared: PreparedCirculation, choice: CirculationChoice, humanReviewed: boolean): CirculationLocalRecord {
    if (!humanReviewed || prepared.disposition !== 'prepared' || prepared.unverifiedFixture !== true ||
        prepared.destination !== DESTINATION || prepared.lane !== 'care') throw Error('EXPLICIT_LOCAL_REVIEW_REQUIRED');
    const reply = makeLocalCirculationReply(prepared, choice);
    const held = this.list();
    const prior = held.find((r) => r.reply.offerId === prepared.offerId);
    if (prior) {
      if (prior.reply.id !== reply.id) throw Error('CIRCULATION_EXISTING_DISPOSITION_CONFLICT');
      return prior; // idempotent re-import; no silently changed choice
    }
    if (held.length >= 16) throw Error('CIRCULATION_LOCAL_STORE_FULL');
    const recordValue = { reply, seedQuestion: prepared.sourceQuestion, invitationQuestion: prepared.question };
    this.storage.setItem(CIRCULATION_STORE_KEY, JSON.stringify([...held, recordValue]));
    return recordValue;
  }
  releaseUnshared(offerId: string, reviewed: boolean): boolean {
    if (!reviewed) throw Error('EXPLICIT_LOCAL_RELEASE_REQUIRED');
    const held = this.list();
    const exists = held.some((r) => r.reply.offerId === offerId);
    if (!exists) return false;
    this.storage.setItem(CIRCULATION_STORE_KEY, JSON.stringify(held.filter((r) => r.reply.offerId !== offerId)));
    return true;
  }
}
