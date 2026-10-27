/**
 * Porchlight Partner Desk specimen: no casework, no shelter placements, no server writes.
 * Public partner information is a research lead, NOT an endorsement.
 * The executable workflow below operates on synthetic task objects only.
 */
export type Region = 'la' | 'humboldt' | 'all';

export interface PartnerLead {
  id: 'people-concern' | 'arcata-house' | 'humboldt-coalition';
  organization: string;
  region: Exclude<Region, 'all'>;
  city: string;
  type: 'direct-service' | 'coalition';
  description: string;
  publicUrl: string;
  contact: string;
  opportunity: string;
  invitationSubject: string;
  invitationBody: string;
  // These are intentionally fixed until independent verified partner evidence exists.
  status: 'RESEARCHED_NOT_CONTACTED';
}

export const PARTNER_LEADS: readonly PartnerLead[] = [
  {
    id: 'people-concern',
    organization: 'The People Concern',
    region: 'la',
    city: 'Los Angeles, California',
    type: 'direct-service',
    description: 'Existing volunteer program for food, donations, and on-site support.',
    publicUrl: 'https://thepeopleconcern.org/volunteer/',
    contact: 'volunteer@thepeopleconcern.org',
    opportunity: 'Ask whether a small recurring shift or supply coordination gap exists.',
    invitationSubject: 'Porchlight: could one volunteer-coordination experiment help?',
    invitationBody: `Hello,

I'm helping design Porchlight, an early-stage volunteer coordination experiment with The Static Collective. We are exploring how established homeless-services organizations might mobilize practical neighborhood contributions without new client intake or access to private case files.

Your volunteer program already helps with food and donations. Is there one recurring supply, shift, or volunteer coordination problem where a small, provider-controlled experiment could save your staff time?

I'd welcome a short conversation to learn what would actually be useful. This is an inquiry, not an established program or request to arrange housing placements. Any trial would require your team's express permission and follow your volunteer and safety procedures.

Thank you,
[Your name / contact]`,
    status: 'RESEARCHED_NOT_CONTACTED',
  },
  {
    id: 'arcata-house',
    organization: 'Arcata House Partnership',
    region: 'humboldt',
    city: 'Arcata, California',
    type: 'direct-service',
    description: 'Local programs and volunteer opportunities for pantry, donations and seasonal support.',
    publicUrl: 'https://www.arcatahouse.org/volunteer',
    contact: 'volunteer@arcatahouse.org',
    opportunity: 'Ask if one partner-chosen laundry, food or donation task needs coordination.',
    invitationSubject: 'Could Porchlight help with one existing volunteer need?',
    invitationBody: `Hello,

I'm developing Porchlight, a small volunteer-built coordination experiment. We hope to make it easier to bring practical neighbor support to established service providers, with no new client database or automatic housing matches.

Your public volunteer opportunities include food, donation and extreme-weather support. Would it be useful to explore one specific task, chosen and supervised by your team, that could be coordinated manually for a week before considering software?

We have not launched a local program. We would not request personal client details. I'd appreciate a brief conversation to understand your priorities and boundaries.

Thank you,
[Your name / contact]`,
    status: 'RESEARCHED_NOT_CONTACTED',
  },
  {
    id: 'humboldt-coalition',
    organization: 'Humboldt Housing & Homelessness Coalition',
    region: 'humboldt',
    city: 'Humboldt County, California',
    type: 'coalition',
    description: 'Community coalition and listening door; not a proposed operator by default.',
    publicUrl: 'https://www.humboldtgov.org/2512/Humboldt-Housing-Homelessness-Coalition',
    contact: 'HHHC@co.humboldt.ca.us',
    opportunity: 'Request an invitation to listen and identify the appropriate direct-service operator.',
    invitationSubject: 'Request to listen: provider-controlled volunteer assistance experiment',
    invitationBody: `Hello,

I'm exploring Porchlight, an early-stage community experiment for coordinating small, provider-approved volunteer assistance. We do not operate a shelter or seek access to guest records.

Would there be an open meeting or appropriate provider we could learn from about gaps in rural volunteer or supply coordination? We are not asking the coalition to sponsor, administer, or endorse the project.

Thank you for any public direction you can provide.

[Your name / contact]`,
    status: 'RESEARCHED_NOT_CONTACTED',
  },
];

export type TrialStatus = 'HOLD' | 'APPROVED' | 'REPORTED' | 'CONFIRMED' | 'REFUSED';
export type ActorRole = 'operator' | 'volunteer' | 'receiver';
export type StepAction = 'APPROVE' | 'REPORT' | 'CONFIRM' | 'REFUSE';

export interface TrialGates {
  operatorAccepted: boolean;
  safeguardingApproved: boolean;
  consentConfirmed: boolean;
  privacyApproved: boolean;
}

export interface TrialReceipt {
  action: StepAction;
  actorRole: ActorRole;
  actorId: string;
  outcome: TrialStatus;
  at: string;
  provenance: 'SYNTHETIC_DEMO_ONLY';
}

export interface TrialWorkOrder {
  id: string;
  region: Exclude<Region, 'all'>;
  title: string;
  category: 'Laundry' | 'Food supplies';
  status: TrialStatus;
  gates: TrialGates;
  reportActorId?: string;
  receipts: TrialReceipt[];
  fixture: true;
}

export const DEMO_WORK_ORDERS: readonly TrialWorkOrder[] = [
  {
    id: 'synthetic-la-laundry-001',
    region: 'la',
    title: 'One load of shelter bedding',
    category: 'Laundry',
    status: 'HOLD',
    gates: { operatorAccepted: false, safeguardingApproved: false, consentConfirmed: false, privacyApproved: false },
    receipts: [],
    fixture: true,
  },
  {
    id: 'synthetic-humboldt-pantry-001',
    region: 'humboldt',
    title: 'One pantry supply pickup',
    category: 'Food supplies',
    status: 'HOLD',
    gates: { operatorAccepted: false, safeguardingApproved: false, consentConfirmed: false, privacyApproved: false },
    receipts: [],
    fixture: true,
  },
];

export function allGatesMet(gates: TrialGates): boolean {
  return gates.operatorAccepted && gates.safeguardingApproved &&
    gates.consentConfirmed && gates.privacyApproved;
}

/** Fail closed: only the next authorized role can advance the synthetic receipt. */
export function advanceTrial(
  work: TrialWorkOrder,
  action: StepAction,
  actor: { id: string; role: ActorRole },
  at: string,
): TrialWorkOrder {
  if (!work.fixture || !work.id.startsWith('synthetic-') || !actor.id.trim() ||
    !Number.isFinite(Date.parse(at))) {
    throw new Error('PORCHLIGHT_SYNTHETIC_ONLY');
  }
  let next: TrialStatus;
  if (action === 'APPROVE' && work.status === 'HOLD' && actor.role === 'operator' && allGatesMet(work.gates)) {
    next = 'APPROVED';
  } else if (action === 'REPORT' && work.status === 'APPROVED' && actor.role === 'volunteer') {
    next = 'REPORTED';
  } else if (action === 'CONFIRM' && work.status === 'REPORTED' && actor.role === 'receiver' &&
    actor.id !== work.reportActorId) {
    next = 'CONFIRMED';
  } else if (action === 'REFUSE' &&
    (work.status === 'HOLD' || work.status === 'APPROVED' || work.status === 'REPORTED') &&
    (actor.role === 'operator' || actor.role === 'receiver')) {
    next = 'REFUSED';
  } else {
    throw new Error('PORCHLIGHT_TRANSITION_REFUSED');
  }

  return {
    ...work,
    status: next,
    reportActorId: action === 'REPORT' ? actor.id : work.reportActorId,
    receipts: [
      ...work.receipts,
      { action, actorRole: actor.role, actorId: actor.id, outcome: next, at, provenance: 'SYNTHETIC_DEMO_ONLY' },
    ],
  };
}

/** Checks cannot be changed after work leaves HOLD; resets require a new demo. */
export function setTrialGate(
  work: TrialWorkOrder,
  gate: keyof TrialGates,
  checked: boolean,
): TrialWorkOrder {
  if (!work.fixture || work.status !== 'HOLD') throw new Error('PORCHLIGHT_GATES_LOCKED');
  return { ...work, gates: { ...work.gates, [gate]: checked } };
}

export function trialCounts(orders: readonly TrialWorkOrder[]): { reported: number; confirmed: number; refused: number } {
  return {
    reported: orders.filter((order) => order.status === 'REPORTED').length,
    confirmed: orders.filter((order) => order.status === 'CONFIRMED').length,
    refused: orders.filter((order) => order.status === 'REFUSED').length,
  };
}
