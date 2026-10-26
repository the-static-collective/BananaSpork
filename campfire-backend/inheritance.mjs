/**
 * INHERITANCE-INTERRUPT-001
 * Prepare a new, independently volunteered offer for PRIVATE human review.
 * Not an extension of, or compensation for, any previously received help.
 * No person, recipient, case, circle, source occurrence, location, or contact detail
 * is accepted across this boundary. The module has no I/O.
 */
export const SCHEMA = 'inheritance.seed-review/v0';

const KINDS = Object.freeze({
  food_sorting: 'Sort or prepare community food supplies',
  garden_work: 'Help with community garden work',
  small_repairs: 'Help with basic repairs',
  setup_cleanup: 'Help set up or clean up a community gathering',
  digital_help: 'Help with everyday digital tasks',
  art_music: 'Share a voluntary creative activity'
});
const AVAILABILITY = Object.freeze({
  one_off: 'One time',
  occasional: 'Occasionally',
  unsure: 'Not sure yet'
});
const INPUT_KEYS = new Set(['purpose', 'intent', 'adultSelfAttested', 'kind', 'availability']);

const refuse = (reason) => ({schema:SCHEMA, state:'REFUSED', reason,
  candidate:null, actionTaken:false, personContacted:false, informationPublished:false});

export function prepareInheritanceSeed(input) {
  if(!input || typeof input!=='object' || Array.isArray(input) ||
    Object.getPrototypeOf(input)!==Object.prototype) return refuse('INVALID_INPUT');
  // Fail closed even on extra harmless-looking keys: there is no case or profile bridge.
  if(Object.keys(input).some(key=>!INPUT_KEYS.has(key))) return refuse('UNDECLARED_FIELD');
  if(input.purpose!=='INDEPENDENT_NEW_OFFER') return refuse('NOT_INDEPENDENT_OFFER');
  if(input.intent!=='I_OFFER_FREELY') return refuse('VOLUNTARY_INTENT_REQUIRED');
  if(input.adultSelfAttested!==true) return refuse('ADULT_SELF_ATTESTATION_REQUIRED');
  if(!Object.hasOwn(KINDS,input.kind)) return refuse('UNSUPPORTED_CAPACITY');
  if(!Object.hasOwn(AVAILABILITY,input.availability)) return refuse('UNSUPPORTED_AVAILABILITY');

  const candidate=Object.freeze({
    kind:input.kind, capacity:KINDS[input.kind],
    availability:input.availability, availabilityLabel:AVAILABILITY[input.availability]
  });
  return {
    schema:SCHEMA,
    state:'HOLD_FOR_PRIVATE_REVIEW',
    basis:'NEW_PERSON_INITIATED_VOLUNTARY_OFFER',
    candidate,
    // These are *required later* rather than asserted completed gates.
    gates:{
      adultIdentityVerified:false,
      safeguardingReviewed:false,
      stewardReviewed:false,
      renewedContactConsent:false,
      independentlyAssigned:false,
      realWorkObserved:false
    },
    authority:{public:false, dispatch:false, match:false, contact:false,
      debtCreated:false, scoreCreated:false, trainingPermission:false},
    actionTaken:false,
    personContacted:false,
    informationPublished:false,
    notice:'Receiving help creates no debt or duty to help. This is a separate voluntary offer. Declining changes nothing about access to support.'
  };
}

function escapeHtml(text){
  return String(text).replace(/[&<>"']/g, s=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[s]);
}

export function renderPrivateReviewCard(result){
  if(result?.schema!==SCHEMA || result?.state!=='HOLD_FOR_PRIVATE_REVIEW' ||
      !result?.candidate || !Object.hasOwn(KINDS,result.candidate.kind) ||
      !Object.hasOwn(AVAILABILITY,result.candidate.availability) ||
      result.candidate.capacity!==KINDS[result.candidate.kind] ||
      result.candidate.availabilityLabel!==AVAILABILITY[result.candidate.availability]){
    throw Error('REVIEW_CARD_REQUIRES_VALID_HELD_CANDIDATE');
  }
  const kind=escapeHtml(result.candidate.capacity), availability=escapeHtml(result.candidate.availabilityLabel);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voluntary offer — private review only</title><style>body{font:18px/1.45 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1.3rem;color:#222}h1{font-size:1.6rem}.warning{border:2px solid #222;padding:.8rem;font-weight:bold}dl{display:grid;grid-template-columns:9rem 1fr;gap:.7rem}dt{font-weight:bold}dd{margin:0}@media print{body{margin:.5in}}</style><main><p class="warning">PRIVATE REVIEW · NOT AN INVITATION · NOT PUBLISHED</p><h1>Someone has volunteered to offer a hand</h1><dl><dt>Possible contribution</dt><dd>${kind}</dd><dt>Availability</dt><dd>${availability}</dd></dl><p>No person is assigned. No recipient, case, circle, contact, or history has been exported.</p><p>Receiving help creates no debt. Declining to help never changes access to support.</p><p><strong>Before any outreach:</strong> privately verify the adult and suitability of the task; secure separate steward review and renewed, task-specific contact permission. Nothing happens automatically.</p></main></html>`;
}

export const supportedSeedKinds = () => Object.freeze(Object.keys(KINDS));
