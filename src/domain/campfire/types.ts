import { BasketCategory, BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import { DonkeyHeldNote } from '../donkey/types';

export type CampfireTab = 'today' | 'porch' | 'basket' | 'grow' | 'remember';

export type ActionVerb = 'need' | 'offer' | 'task' | 'event' | 'remember';

export type ProposalStatus = 'proposed' | 'confirmed' | 'rejected';

export interface ActionProposal {
  id: string;
  verb: ActionVerb;
  title: string;
  description: string;
  proposedBy: string;
  timestamp: string;
  status: ProposalStatus;
  nonAuthoritative?: boolean;
  details?: {
    category?: BasketCategory;
    dateOrTime?: string;
    assignee?: string;
  };
}

export interface TodayAttentionItem {
  id: string;
  type: 'open_need' | 'meal_concern' | 'unconfirmed_proposal';
  title: string;
  subtitle: string;
  badge: string;
  actionLabel: string;
  seedId?: string;
  needId?: string;
  proposalId?: string;
}

export interface TodayActionItem {
  id: string;
  type: 'active_pledge' | 'available_offer' | 'quick_good_enough';
  title: string;
  subtitle: string;
  badge: string;
  actionLabel: string;
  offerId?: string;
  seedId?: string;
  needId?: string;
}

export interface TodayChangedItem {
  id: string;
  type: 'recent_receipt' | 'held_note' | 'confirmed_seed';
  title: string;
  subtitle: string;
  timestamp: string;
  privateToDevice?: boolean;
  isHeldNote?: boolean;
  receiptId?: string;
}

export interface TodayProjection {
  needsAttention: TodayAttentionItem[];
  canDo: TodayActionItem[];
  whatChanged: TodayChangedItem[];
}
