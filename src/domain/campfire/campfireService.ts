import { BasketOffer, KidProfile, ParticipationSeed, WitnessReceipt } from '../../types';
import { DonkeyHeldNote } from '../donkey/types';
import { getHeldNotes } from '../donkey/donkeyService';
import {
  ActionProposal,
  ActionVerb,
  TodayActionItem,
  TodayAttentionItem,
  TodayChangedItem,
  TodayProjection,
} from './types';

const STORAGE_KEY_PROPOSALS = 'bananagram_action_proposals_v1';

function loadLocalProposals(): ActionProposal[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_PROPOSALS);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // Fall through to isolated in-memory storage.
  }
  return [];
}

function persistLocalProposals(proposals: ActionProposal[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PROPOSALS, JSON.stringify(proposals));
    }
  } catch {
    // Local capture remains available for this process even if storage is full.
  }
}

// Proposals are device-local until an explicit supported authority command succeeds.
let localProposals: ActionProposal[] = loadLocalProposals();

export function getLocalProposals(): ActionProposal[] {
  return [...localProposals];
}

export function createActionProposal(
  verb: ActionVerb,
  title: string,
  proposedBy: string,
  description?: string,
  details?: ActionProposal['details']
): ActionProposal {
  const isNonAuthoritative = verb === 'task' || verb === 'event';
  const proposal: ActionProposal = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    verb,
    title: title.trim(),
    description: description || `Proposed ${verb} action for household circle`,
    proposedBy,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'proposed',
    nonAuthoritative: isNonAuthoritative,
    details,
  };

  localProposals = [proposal, ...localProposals];
  persistLocalProposals(localProposals);
  return proposal;
}

export function confirmActionProposal(proposalId: string): ActionProposal | null {
  const idx = localProposals.findIndex((p) => p.id === proposalId);
  if (idx === -1) return null;

  localProposals[idx] = {
    ...localProposals[idx],
    status: 'confirmed',
  };
  persistLocalProposals(localProposals);

  return localProposals[idx];
}

export function parseMessageCommandToProposal(
  text: string,
  authorName: string
): ActionProposal | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;

  const firstSpaceIndex = trimmed.indexOf(' ');
  const command = firstSpaceIndex === -1 ? trimmed.substring(1) : trimmed.substring(1, firstSpaceIndex);
  const content = firstSpaceIndex === -1 ? '' : trimmed.substring(firstSpaceIndex + 1).trim();

  if (!content) return null;

  const validVerbs: ActionVerb[] = ['need', 'offer', 'task', 'event', 'remember'];
  const lowerCmd = command.toLowerCase() as ActionVerb;

  if (!validVerbs.includes(lowerCmd)) return null;

  return createActionProposal(
    lowerCmd,
    content,
    authorName,
    `Created via ${command} proposal command`
  );
}

// Today projection builder (Read-model projection answering 3 core questions in under 5s)
export function buildTodayProjection(
  seeds: ParticipationSeed[],
  offers: BasketOffer[],
  receipts: WitnessReceipt[],
  kidProfile: KidProfile,
  proposals: ActionProposal[] = localProposals,
  currentUser?: { id: string; role: string }
): TodayProjection {
  // 1. WHAT NEEDS ATTENTION?
  const needsAttention: TodayAttentionItem[] = [];

  // Open Needs from Seeds
  seeds.forEach((sd) => {
    sd.needs.forEach((nd) => {
      if (nd.status === 'open') {
        needsAttention.push({
          id: `attn-need-${sd.id}-${nd.id}`,
          type: 'open_need',
          title: nd.title,
          subtitle: `Open need in seed: "${sd.title}" (By ${sd.authorName})`,
          badge: 'Open Need',
          actionLabel: 'Pledge Support',
          seedId: sd.id,
          needId: nd.id,
          canAct: currentUser?.role !== 'household',
        });
      }
    });
  });

  // Household Meal / Picky Eating Alert
  if (kidProfile) {
    needsAttention.push({
      id: 'attn-meal-concern',
      type: 'meal_concern',
      title: `${kidProfile.name}'s Meal Prep Check (${kidProfile.age})`,
      subtitle: `Pickiness: ${kidProfile.pickiness} • Allergies: ${kidProfile.allergies.join(', ') || 'None'}. Try dips: ${kidProfile.favoriteDips.join(', ')}`,
      badge: 'Household Meal Care',
      actionLabel: 'Open Pantry Rescue',
    });
  }

  // Unconfirmed Proposals
  proposals
    .filter((p) => p.status === 'proposed')
    .forEach((p) => {
      needsAttention.push({
        id: `attn-prop-${p.id}`,
        type: 'unconfirmed_proposal',
        title: `Proposal: ${p.verb.toUpperCase()} "${p.title}"`,
        subtitle: `Proposed by ${p.proposedBy} • Awaiting household confirmation`,
        badge: p.nonAuthoritative ? 'Proposal (Non-authoritative)' : 'Pending Proposal',
        actionLabel: 'Review & Confirm',
        proposalId: p.id,
      });
    });

  // 2. WHAT CAN I DO?
  const canDo: TodayActionItem[] = [];

  // Lifecycle actions. Shared records carry explicit authority IDs; local demo
  // records retain the smaller pledge/confirm loop without pretending to be shared.
  seeds.forEach((sd) => {
    sd.needs.forEach((nd) => {
      if (nd.status === 'pledged' && !nd.authorityOfferId) {
        canDo.push({
          id: `cando-pledge-${sd.id}-${nd.id}`,
          type: 'active_pledge',
          title: `Active Commitment: ${nd.title}`,
          subtitle: `Pledged by ${nd.pledgedBy || 'Neighbor'} for seed "${sd.title}"`,
          badge: 'In Progress',
          actionLabel: 'Confirm Fulfillment',
          seedId: sd.id,
          needId: nd.id,
        });
      }

      if (
        nd.status === 'pledged' &&
        nd.authorityOfferId &&
        currentUser?.role === 'household'
      ) {
        canDo.push({
          id: `cando-review-${nd.authorityOfferId}`,
          type: 'review_offer',
          title: `Review offer: ${nd.title}`,
          subtitle: `${nd.pledgedBy || 'A neighbor'} offered support for “${sd.title}”`,
          badge: 'Household authority',
          actionLabel: 'Accept Offer',
          seedId: sd.id,
          offerId: nd.authorityOfferId,
        });
      }

      if (
        nd.status === 'accepted' &&
        nd.authorityOfferId &&
        nd.contributorId === currentUser?.id
      ) {
        canDo.push({
          id: `cando-report-${nd.authorityOfferId}`,
          type: 'report_fulfillment',
          title: `Report delivery: ${nd.title}`,
          subtitle: `Your accepted contribution to “${sd.title}” is ready to be reported`,
          badge: 'Contributor action',
          actionLabel: 'Report Fulfilled',
          seedId: sd.id,
          offerId: nd.authorityOfferId,
        });
      }

      if (
        nd.status === 'reported' &&
        nd.authorityOfferId &&
        currentUser?.role === 'household'
      ) {
        canDo.push({
          id: `cando-confirm-${nd.authorityOfferId}`,
          type: 'confirm_fulfillment',
          title: `Confirm receipt: ${nd.title}`,
          subtitle: `${nd.pledgedBy || 'A neighbor'} reported fulfillment for “${sd.title}”`,
          badge: 'Human witness required',
          actionLabel: 'Confirm Fulfillment',
          seedId: sd.id,
          offerId: nd.authorityOfferId,
        });
      }
    });
  });

  // Time-Sensitive Basket Offers
  offers.slice(0, 3).forEach((off) => {
    canDo.push({
      id: `cando-offer-${off.id}`,
      type: 'available_offer',
      title: `${off.icon} ${off.title}`,
      subtitle: `Shared by ${off.contributorName} • Available: ${off.availability}`,
      badge: off.category,
      actionLabel: 'Connect / Claim',
      offerId: off.id,
    });
  });

  // Quick Good Enough Action
  canDo.push({
    id: 'cando-quick-good-enough',
    type: 'quick_good_enough',
    title: 'Good-Enough Daily Contribution',
    subtitle: 'Share 1 offer into the neighborhood basket or log a quick remembrance moment.',
    badge: 'Shame-Free Care',
    actionLabel: '+ Universal Create',
  });

  // 3. WHAT CHANGED?
  const whatChanged: TodayChangedItem[] = [];

  // Held Donkey Notes (PRIVATE ONLY to this device!)
  const heldNotes = getHeldNotes();
  heldNotes.forEach((note) => {
    whatChanged.push({
      id: `chg-held-${note.id}`,
      type: 'held_note',
      title: `🔒 Private Unsent Draft Held on Device`,
      subtitle: `"${note.draft.substring(0, 70)}${note.draft.length > 70 ? '...' : ''}"`,
      timestamp: note.timestamp,
      privateToDevice: true,
      isHeldNote: true,
    });
  });

  // Recent Confirmed Witness Receipts
  receipts.slice(0, 5).forEach((rcpt) => {
    whatChanged.push({
      id: `chg-rcpt-${rcpt.id}`,
      type: 'recent_receipt',
      title: rcpt.title,
      subtitle: `${rcpt.actorName}: ${rcpt.details}`,
      timestamp: rcpt.timestamp,
      receiptId: rcpt.id,
    });
  });

  // Today Ordering Rule:
  // - Needs Attention: Unconfirmed proposals first, then open needs, then meal care
  // - What Changed: Held notes (private) first, then recent receipts ordered newest first
  return {
    needsAttention,
    canDo,
    whatChanged,
  };
}

// CONTRACT DOCUMENTATION REPORT FOR TASK & EVENT AUTHORITATIVE SUPPORT
export const TASK_EVENT_AUTHORITY_CONTRACT_SPEC = {
  status: 'NON_AUTHORITATIVE_READ_MODEL_ONLY',
  description:
    'Task and Event entities are represented as non-authoritative household proposals because the Jubilee authority plane currently indexes Witness Receipts and Seeds/Offers. The contracts below describe the required RPC methods and event schemas for full authoritative backing.',
  requiredCommands: [
    {
      command: 'CreateHouseholdTask',
      payload: {
        taskId: 'string',
        title: 'string',
        assignee: 'string | null',
        dueDate: 'string | null',
        householdCircleId: 'string',
      },
    },
    {
      command: 'ScheduleHouseholdEvent',
      payload: {
        eventId: 'string',
        title: 'string',
        startAt: 'ISO8601 string',
        location: 'string | null',
        householdCircleId: 'string',
      },
    },
  ],
  requiredEvents: [
    'HouseholdTaskCreatedEvent',
    'HouseholdTaskCompletedEvent',
    'HouseholdEventScheduledEvent',
    'HouseholdEventCancelledEvent',
  ],
};
