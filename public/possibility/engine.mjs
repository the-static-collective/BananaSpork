// POSSIBILITY ENGINE 001: deterministic, local-only candidate composition.
// No network, no identity proof, no allocation or execution authority.
export const SCHEMA = 'garden.possibility/v0.1';
const STATUSES = new Set(['candidate', 'available', 'withdrawn']);
const GATE_STATES = new Set(['open', 'approved', 'refused']);
const EVENT_TYPES = new Set(['OFFER_ACCEPTED', 'FULFILLMENT_REPORTED', 'FULFILLMENT_CONFIRMED', 'REFUSED']);

export const example = () => ({
  schema: SCHEMA,
  title: 'Community food possibility · SYNTHETIC EXAMPLE',
  requirements: [
    { id: 'ingredient', label: 'Appropriate ingredients' },
    { id: 'preparation', label: 'Qualified preparation' },
    { id: 'packaging', label: 'Safe packaging' },
    { id: 'transport', label: 'Transport to willing receiver' }
  ],
  gates: [
    { id: 'host', label: 'Receiving host and food handling permission', state: 'open' }
  ],
  offers: [
    { id: 'flour', label: 'Neighbor A · oat flour', provides: ['ingredient'], dependsOn: [], state: 'available' },
    { id: 'baker', label: 'Neighbor B · qualified cook', provides: ['preparation', 'packaging'], dependsOn: ['ingredient'], state: 'candidate' },
    { id: 'driver', label: 'Neighbor C · transportation', provides: ['transport'], dependsOn: ['packaging'], state: 'candidate' }
  ],
  events: []
});

function idsAreUnique(items) { return new Set(items.map(x => x.id)).size === items.length; }
function safeText(s) { return typeof s === 'string' && s.trim().length > 0 && s.length <= 200; }
function err(message) { throw new Error(message); }

export function validateWorld(world) {
  if (!world || world.schema !== SCHEMA || !safeText(world.title)) err('Unknown or malformed world schema/title');
  if (!Array.isArray(world.requirements) || world.requirements.length < 1 || world.requirements.length > 10 || !idsAreUnique(world.requirements)) err('Provide 1–10 unique requirements');
  if (!Array.isArray(world.gates) || world.gates.length > 10 || !idsAreUnique(world.gates)) err('Invalid gates');
  if (!Array.isArray(world.offers) || world.offers.length > 12 || !idsAreUnique(world.offers)) err('Provide no more than 12 unique offers');
  if (!Array.isArray(world.events) || world.events.length > 250) err('Too many events');
  const reqIds = new Set(world.requirements.map(x => x.id));
  for (const r of world.requirements) if (!safeText(r.id) || !safeText(r.label)) err('Invalid requirement');
  for (const g of world.gates) if (!safeText(g.id) || !safeText(g.label) || !GATE_STATES.has(g.state)) err('Invalid gate');
  for (const o of world.offers) {
    if (!safeText(o.id) || !safeText(o.label) || !STATUSES.has(o.state) || !Array.isArray(o.provides) || !Array.isArray(o.dependsOn)) err('Invalid offer');
    if (!o.provides.length || !o.provides.every(id => reqIds.has(id)) || !o.dependsOn.every(id => reqIds.has(id))) err('Offer references unknown requirement');
  }
  for (const e of world.events) {
    if (!safeText(e.id) || !safeText(e.actor) || !EVENT_TYPES.has(e.type) || !safeText(e.at)) err('Invalid event');
    if (e.requirementId && !reqIds.has(e.requirementId)) err('Event references unknown requirement');
    if (e.offerId && !world.offers.some(o => o.id === e.offerId)) err('Event references unknown offer');
  }
  return world;
}

// Dependency closure: conditional offers can activate only after another
// actually activated offer covers their prerequisite. Mutual dependency loops
// without an independent seed cannot invent their own enabling capacity.
function closure(selected, allowCandidates) {
  let covered = new Set(), activated = new Set();
  for (let round = 0; round <= selected.length; round++) {
    let changed = false;
    for (const o of selected) {
      if (activated.has(o.id) || o.state === 'withdrawn' || (!allowCandidates && o.state !== 'available')) continue;
      if (o.dependsOn.every(id => covered.has(id))) {
        activated.add(o.id);
        o.provides.forEach(id => covered.add(id));
        changed = true;
      }
    }
    if (!changed) break;
  }
  return { covered, activated };
}

function better(a, b) {
  if (!b) return true;
  if (a.potentialCount !== b.potentialCount) return a.potentialCount > b.potentialCount;
  if (a.readyCount !== b.readyCount) return a.readyCount > b.readyCount;
  if (a.candidateCount !== b.candidateCount) return a.candidateCount < b.candidateCount;
  if (a.selected.length !== b.selected.length) return a.selected.length < b.selected.length;
  return a.key < b.key;
}

export function compose(world) {
  validateWorld(world);
  const eligible = world.offers.filter(o => o.state !== 'withdrawn').sort((a,b) => a.id.localeCompare(b.id));
  let best;
  // Explicitly bounded exhaustive search: <=12 offers => <=4096 subsets.
  for (let mask = 0; mask < (1 << eligible.length); mask++) {
    const selected = eligible.filter((_, i) => (mask & (1 << i)) !== 0);
    const potential = closure(selected, true);
    const ready = closure(selected, false);
    const candidate = {
      selected, potential, ready,
      potentialCount: potential.covered.size, readyCount: ready.covered.size,
      candidateCount: selected.filter(o => o.state === 'candidate').length,
      key: selected.map(o => o.id).join('|')
    };
    if (better(candidate, best)) best = candidate;
  }
  const missing = world.requirements.filter(r => !best.potential.covered.has(r.id));
  const awaitingOffers = best.selected.filter(o => o.state === 'candidate');
  const blockedByDependency = best.selected.filter(o => !best.potential.activated.has(o.id));
  const openGates = world.gates.filter(g => g.state === 'open');
  const refusedGates = world.gates.filter(g => g.state === 'refused');
  const ready = missing.length === 0 && awaitingOffers.length === 0 && openGates.length === 0 && refusedGates.length === 0 && best.ready.covered.size === world.requirements.length;
  let question;
  if (refusedGates.length) question = `STOP: ${refusedGates[0].label} was refused. Ask whether a separately authorized alternative exists; do not override refusal.`;
  else if (missing.length) question = `Who could voluntarily provide: ${missing[0].label}?`;
  else if (blockedByDependency.length) question = `What independent capacity could unblock: ${blockedByDependency[0].label}?`;
  else if (openGates.length) question = `Who is authorized to decide: ${openGates[0].label}?`;
  else if (awaitingOffers.length) question = `Would ${awaitingOffers[0].label} voluntarily confirm availability for this specific request?`;
  else question = 'All declared ingredients are available for a human invitation. Has each participant accepted this particular arrangement?';
  return {
    status: refusedGates.length ? 'REFUSED_GATE' : ready ? 'READY_FOR_INVITATION_ONLY' : 'HOLD',
    selectedOfferIds: best.selected.map(o => o.id),
    potentialCovered: [...best.potential.covered].sort(),
    readyCovered: [...best.ready.covered].sort(),
    missingRequirementIds: missing.map(r => r.id),
    candidateOfferIds: awaitingOffers.map(o => o.id),
    blockedDependencyOfferIds: blockedByDependency.map(o => o.id),
    openGateIds: openGates.map(g => g.id),
    refusedGateIds: refusedGates.map(g => g.id),
    nextQuestion: question,
    evaluatedSubsets: 1 << eligible.length,
    explanation: 'Exhaustive minimal candidate composition; no automatic communication, commitment, allocation, or confirmation.'
  };
}

export function addEvent(world, draft) {
  validateWorld(world);
  if (!draft || !EVENT_TYPES.has(draft.type) || !safeText(draft.actor) || !safeText(draft.id) || !safeText(draft.at)) err('Invalid event input');
  if (world.events.some(e => e.id === draft.id)) err('Duplicate event ID');
  const offer = world.offers.find(o => o.id === draft.offerId);
  const req = world.requirements.find(r => r.id === draft.requirementId);
  if (draft.type === 'OFFER_ACCEPTED' && (!offer || offer.state === 'withdrawn')) err('Acceptance requires non-withdrawn offer');
  if (draft.type === 'FULFILLMENT_REPORTED') {
    if (!req) err('Report requires a specific requirement');
    if (!world.events.some(e => e.type === 'OFFER_ACCEPTED' && world.offers.find(o => o.id === e.offerId)?.provides.includes(req.id))) err('Report requires a previously accepted contributing offer');
  }
  if (draft.type === 'FULFILLMENT_CONFIRMED') {
    if (!req) err('Confirmation requires a specific requirement');
    const reports = world.events.filter(e => e.type === 'FULFILLMENT_REPORTED' && e.requirementId === req.id);
    if (!reports.length) err('No report to confirm');
    if (!reports.some(e => e.actor !== draft.actor)) err('Reporter cannot independently confirm their own report');
    if (world.events.some(e => e.type === 'FULFILLMENT_CONFIRMED' && e.requirementId === req.id)) err('Requirement already has a confirmation');
  }
  const e = { id: draft.id, at: draft.at, type: draft.type, actor: draft.actor.trim(), ...(offer ? {offerId: offer.id}: {}), ...(req ? {requirementId:req.id}: {}), note: String(draft.note || '').slice(0,500) };
  const next = { ...world, events: [...world.events, e] };
  validateWorld(next);
  return next;
}

export function receipt(world) {
  validateWorld(world);
  const reports = world.events.filter(e => e.type === 'FULFILLMENT_REPORTED');
  const confirmations = world.events.filter(e => e.type === 'FULFILLMENT_CONFIRMED');
  return {
    schema: 'garden.possibility-receipt/v0.1', generatedAt: new Date().toISOString(),
    world: structuredClone(world), candidatePlan: compose(world),
    claimedConfirmedRequirements: [...new Set(confirmations.map(e => e.requirementId))],
    reportedRequirements: [...new Set(reports.map(e => e.requirementId))],
    verification: 'LOCAL_SELF_ATTESTED_IDENTITIES_NOT_AUTHENTICATED',
    authority: 'NONE', disclosure: 'PRIVATE_BY_DEFAULT',
    cautions: ['An independently named confirmer is not independently authenticated', 'No physical event was independently verified by software', 'Receipt export is editable and not cryptographically signed']
  };
}

