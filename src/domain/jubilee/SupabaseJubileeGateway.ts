import { BasketOffer, ParticipationSeed, WitnessReceipt, WitnessEventType } from '../../types';
import {
  CommandResult,
  JubileeCurrentUser,
  JubileeGateway,
  JubileeState,
  RuntimeMode,
} from './contracts';
import {
  fetchMyMemberships,
  fetchCircleEvents,
  fetchCircleHead,
  projectNeeds,
  newIdempotencyKey,
  NeedProjection,
} from '../../lib/circle';
import {
  openNeed,
  pledgeOffer,
  acceptOffer,
  declineOffer,
  reportFulfillment,
  confirmFulfillment,
  closeNeed,
  upsertProfile,
  createHouseholdAndCircle,
  createInvitation,
  redeemInvitation,
} from '../../lib/rpc.functions';

export class SupabaseJubileeGateway implements JubileeGateway {
  private currentUser: JubileeCurrentUser;
  private listeners: Set<(state: JubileeState) => void> = new Set();
  private supabaseUrl?: string;
  private supabaseAnonKey?: string;
  private activeCircleId?: string;

  constructor(currentUser?: JubileeCurrentUser) {
    this.currentUser = currentUser || {
      id: 'unauthenticated-user',
      name: 'Unauthenticated Campfire Member',
      role: 'Member',
    };

    const meta = import.meta as Record<string, any>;
    if (typeof meta !== 'undefined' && meta.env) {
      this.supabaseUrl = meta.env.VITE_SUPABASE_URL;
      this.supabaseAnonKey = meta.env.VITE_SUPABASE_ANON_KEY || meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    }
  }

  public getRuntimeMode(): RuntimeMode {
    return 'shared_campfire';
  }

  public isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey);
  }

  public getState(): JubileeState {
    return {
      runtimeMode: this.getRuntimeMode(),
      offers: [],
      seeds: [],
      receipts: [],
      currentUser: { ...this.currentUser },
    };
  }

  public setCurrentUser(user: JubileeCurrentUser): void {
    if (
      this.currentUser.id === user.id &&
      this.currentUser.name === user.name &&
      this.currentUser.role === user.role
    ) {
      return;
    }
    this.currentUser = user;
    this.notify();
  }

  public setActiveCircleId(circleId: string): void {
    this.activeCircleId = circleId;
  }

  public getActiveCircleId(): string | undefined {
    return this.activeCircleId;
  }

  public async getProjections(): Promise<{ needs: NeedProjection[]; receipts: WitnessReceipt[] }> {
    if (!this.isConfigured() || !this.activeCircleId) {
      return { needs: [], receipts: [] };
    }

    try {
      const events = await fetchCircleEvents(this.activeCircleId);
      const needs = projectNeeds(events);

      const receipts: WitnessReceipt[] = events.map((e) => ({
        id: e.event_id,
        sequence: e.sequence,
        sha256Hash: e.event_hash,
        predecessorHash: e.previous_hash,
        actorName: e.actor_label,
        eventType: (e.kind as WitnessEventType) || 'receipt.witnessed',
        title: (e.payload as any)?.title || e.kind,
        timestamp: e.occurred_at_text,
        details: (e.payload as any)?.summary || (e.payload as any)?.note || e.kind,
      }));

      return { needs, receipts };
    } catch (err: any) {
      console.error('[SupabaseJubileeGateway] Error fetching circle projections:', err);
      return { needs: [], receipts: [] };
    }
  }

  public async getOffers(): Promise<BasketOffer[]> {
    if (!this.isConfigured()) {
      return [];
    }
    const { needs } = await this.getProjections();
    const offers: BasketOffer[] = [];

    for (const n of needs) {
      for (const o of n.offers) {
        offers.push({
          id: o.offerId,
          title: o.label,
          category: (o.kind as any) || 'Care',
          contributorName: o.contributorLabel,
          availability: o.status,
          boundary: 'Circle',
          icon: '🌱',
          timestamp: o.reportedAt || o.confirmedAt || 'Recently',
        });
      }
    }

    return offers;
  }

  public async getSeeds(): Promise<ParticipationSeed[]> {
    if (!this.isConfigured()) {
      return [];
    }
    const { needs } = await this.getProjections();

    return needs.map((n) => ({
      id: n.needId,
      title: n.title,
      stage: n.status === 'fulfilled' ? 'Harvest' : 'Seed',
      authorName: n.householdLabel,
      description: n.summary,
      needs: [
        {
          id: n.needId,
          title: `${n.targetUnits} ${n.unitLabel}`,
          category: 'Care',
          status: n.status === 'fulfilled' ? 'fulfilled' : 'open',
        },
      ],
      makesPossible: [n.unitLabel],
      graftsCount: n.offers.length,
      harvestsCount: n.confirmedUnits,
      timestamp: n.createdAt,
    }));
  }

  public async getReceipts(): Promise<WitnessReceipt[]> {
    if (!this.isConfigured()) {
      return [];
    }
    const { receipts } = await this.getProjections();
    return receipts;
  }

  public subscribe(listener: (state: JubileeState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  // Authoritative RPC command wrappers

  public async addOffer(
    _offer: Omit<BasketOffer, 'id' | 'timestamp'>
  ): Promise<CommandResult<BasketOffer>> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error:
          'Supabase authority plane is not connected. Missing environment variables (VITE_SUPABASE_URL) or active authenticated session. Please configure Supabase and authenticate to publish shared campfire offers.',
      };
    }

    return {
      success: false,
      error:
        'A standalone offer is not supported in the Jubilee ledger contract. Pledges must be attached to an open need (via pledgeNeed).',
    };
  }

  public async addSeed(
    seed: Omit<ParticipationSeed, 'id' | 'timestamp'>
  ): Promise<CommandResult<ParticipationSeed>> {
    if (!this.isConfigured() || !this.activeCircleId) {
      return {
        success: false,
        error:
          'Supabase authority plane is not connected. Missing environment variables (VITE_SUPABASE_URL) or active authenticated session. Please configure Supabase and authenticate to plant shared campfire seeds.',
      };
    }

    try {
      const head = await fetchCircleHead(this.activeCircleId);
      const idemKey = newIdempotencyKey('open_need');

      const result = await openNeed({
        circleId: this.activeCircleId,
        expectedHead: head.head_hash,
        idempotencyKey: idemKey,
        title: seed.title,
        summary: seed.description,
        requestedItems: seed.makesPossible || ['Care'],
        unitLabel: 'units',
        targetUnits: 1,
        visibility: 'circle',
      });

      const receipt: WitnessReceipt | undefined = (result as any)?.receipt?.event
        ? {
            id: (result as any).receipt.event.eventId,
            sequence: (result as any).receipt.event.sequence,
            sha256Hash: (result as any).receipt.event.eventHash,
            predecessorHash: (result as any).receipt.event.previousHash,
            actorName: (result as any).receipt.event.actor.label,
            eventType: 'need.opened',
            title: seed.title,
            timestamp: (result as any).receipt.event.occurredAt,
            details: seed.description,
          }
        : undefined;

      return {
        success: true,
        data: {
          ...seed,
          id: (result as any)?.receipt?.event?.aggregateId || `seed-${Date.now()}`,
          timestamp: 'Just now',
        },
        witnessReceipt: receipt,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to open need on Supabase authority plane',
      };
    }
  }

  public async pledgeNeed(
    seedId: string,
    needId: string,
    _pledgedBy?: string
  ): Promise<CommandResult<ParticipationSeed>> {
    if (!this.isConfigured() || !this.activeCircleId) {
      return {
        success: false,
        error:
          'Supabase authority plane is not connected. Direct client mutations to witness_events are forbidden; authoritative transactions must route through authenticated SECURITY DEFINER RPCs.',
      };
    }

    try {
      const head = await fetchCircleHead(this.activeCircleId);
      const idemKey = newIdempotencyKey('pledge_offer');

      const result = await pledgeOffer({
        circleId: this.activeCircleId,
        expectedHead: head.head_hash,
        idempotencyKey: idemKey,
        needId: needId || seedId,
        kind: 'goods',
        label: `Pledge support for need`,
        promisedUnits: 1,
        note: 'Pledged via BananaGram',
      });

      const receipt: WitnessReceipt | undefined = (result as any)?.receipt?.event
        ? {
            id: (result as any).receipt.event.eventId,
            sequence: (result as any).receipt.event.sequence,
            sha256Hash: (result as any).receipt.event.eventHash,
            predecessorHash: (result as any).receipt.event.previousHash,
            actorName: (result as any).receipt.event.actor.label,
            eventType: 'offer.pledged',
            title: 'Pledge Offered',
            timestamp: (result as any).receipt.event.occurredAt,
            details: 'Pledged support for need',
          }
        : undefined;

      return {
        success: true,
        witnessReceipt: receipt,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to pledge offer on Supabase authority plane',
      };
    }
  }

  public async confirmFulfillment(
    _seedId: string,
    offerId: string
  ): Promise<CommandResult<ParticipationSeed>> {
    if (!this.isConfigured() || !this.activeCircleId) {
      return {
        success: false,
        error:
          'Supabase authority plane is not connected. Direct client mutations to witness_events are forbidden; authoritative transactions must route through authenticated SECURITY DEFINER RPCs.',
      };
    }

    try {
      const head = await fetchCircleHead(this.activeCircleId);
      const idemKey = newIdempotencyKey('confirm_fulfillment');

      const result = await confirmFulfillment({
        circleId: this.activeCircleId,
        expectedHead: head.head_hash,
        idempotencyKey: idemKey,
        offerId,
        confirmedUnits: 1,
      });

      const receipt: WitnessReceipt | undefined = (result as any)?.receipt?.event
        ? {
            id: (result as any).receipt.event.eventId,
            sequence: (result as any).receipt.event.sequence,
            sha256Hash: (result as any).receipt.event.eventHash,
            predecessorHash: (result as any).receipt.event.previousHash,
            actorName: (result as any).receipt.event.actor.label,
            eventType: 'fulfillment.confirmed',
            title: 'Fulfillment Confirmed',
            timestamp: (result as any).receipt.event.occurredAt,
            details: 'Fulfillment confirmed by household',
          }
        : undefined;

      return {
        success: true,
        witnessReceipt: receipt,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to confirm fulfillment on Supabase authority plane',
      };
    }
  }

  // Admin / Profile / Invitation helpers

  public async upsertUserProfile(displayName: string): Promise<any> {
    return upsertProfile(displayName);
  }

  public async createHousehold(householdLabel: string, circleLabel: string): Promise<any> {
    const idemKey = newIdempotencyKey('create_household');
    return createHouseholdAndCircle({ householdLabel, circleLabel, idempotencyKey: idemKey });
  }

  public async createCircleInvitation(circleId: string): Promise<any> {
    const idemKey = newIdempotencyKey('create_invitation');
    return createInvitation({ circleId, idempotencyKey: idemKey });
  }

  public async redeemCircleInvitation(token: string): Promise<any> {
    return redeemInvitation(token);
  }

  public async acceptPledgedOffer(offerId: string): Promise<any> {
    if (!this.activeCircleId) throw new Error('No active circle set');
    const head = await fetchCircleHead(this.activeCircleId);
    const idemKey = newIdempotencyKey('accept_offer');
    return acceptOffer({
      circleId: this.activeCircleId,
      expectedHead: head.head_hash,
      idempotencyKey: idemKey,
      offerId,
    });
  }

  public async declinePledgedOffer(offerId: string, reason?: string): Promise<any> {
    if (!this.activeCircleId) throw new Error('No active circle set');
    const head = await fetchCircleHead(this.activeCircleId);
    const idemKey = newIdempotencyKey('decline_offer');
    return declineOffer({
      circleId: this.activeCircleId,
      expectedHead: head.head_hash,
      idempotencyKey: idemKey,
      offerId,
      reason,
    });
  }

  public async reportFulfillmentAction(offerId: string, note?: string): Promise<any> {
    if (!this.activeCircleId) throw new Error('No active circle set');
    const head = await fetchCircleHead(this.activeCircleId);
    const idemKey = newIdempotencyKey('report_fulfillment');
    return reportFulfillment({
      circleId: this.activeCircleId,
      expectedHead: head.head_hash,
      idempotencyKey: idemKey,
      offerId,
      note,
    });
  }

  public async closeNeedAction(needId: string, reason: string): Promise<any> {
    if (!this.activeCircleId) throw new Error('No active circle set');
    const head = await fetchCircleHead(this.activeCircleId);
    const idemKey = newIdempotencyKey('close_need');
    return closeNeed({
      circleId: this.activeCircleId,
      expectedHead: head.head_hash,
      idempotencyKey: idemKey,
      needId,
      reason,
    });
  }
}
