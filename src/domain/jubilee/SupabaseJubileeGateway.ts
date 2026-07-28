import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import {
  CommandResult,
  JubileeCurrentUser,
  JubileeGateway,
  JubileeState,
  RuntimeMode,
} from './contracts';

export class SupabaseJubileeGateway implements JubileeGateway {
  private currentUser: JubileeCurrentUser;
  private listeners: Set<(state: JubileeState) => void> = new Set();
  private supabaseUrl?: string;
  private supabaseAnonKey?: string;

  constructor(currentUser?: JubileeCurrentUser) {
    this.currentUser = currentUser || {
      id: 'unauthenticated-user',
      name: 'Unauthenticated Campfire Member',
      role: 'Member',
    };

    const meta = import.meta as Record<string, any>;
    if (typeof meta !== 'undefined' && meta.env) {
      this.supabaseUrl = meta.env.VITE_SUPABASE_URL;
      this.supabaseAnonKey = meta.env.VITE_SUPABASE_ANON_KEY;
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

  public async getOffers(): Promise<BasketOffer[]> {
    if (!this.isConfigured()) {
      console.warn('[SupabaseJubileeGateway] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing.');
      return [];
    }
    // RPC call adapter boundary:
    // TODO: Wire against real bananagram_core RPC projection functions when migrations are loaded.
    return [];
  }

  public async getSeeds(): Promise<ParticipationSeed[]> {
    if (!this.isConfigured()) {
      return [];
    }
    return [];
  }

  public async getReceipts(): Promise<WitnessReceipt[]> {
    if (!this.isConfigured()) {
      return [];
    }
    return [];
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

  public async addOffer(
    _offer: Omit<BasketOffer, 'id' | 'timestamp'>
  ): Promise<CommandResult<BasketOffer>> {
    return {
      success: false,
      error:
        'Supabase authority plane is not connected. Missing environment variables (VITE_SUPABASE_URL) or active authenticated session. Please configure Supabase and authenticate to publish shared campfire offers.',
    };
  }

  public async addSeed(
    _seed: Omit<ParticipationSeed, 'id' | 'timestamp'>
  ): Promise<CommandResult<ParticipationSeed>> {
    return {
      success: false,
      error:
        'Supabase authority plane is not connected. Missing environment variables (VITE_SUPABASE_URL) or active authenticated session. Please configure Supabase and authenticate to plant shared campfire seeds.',
    };
  }

  public async pledgeNeed(
    _seedId: string,
    _needId: string,
    _pledgedBy?: string
  ): Promise<CommandResult<ParticipationSeed>> {
    return {
      success: false,
      error:
        'Supabase authority plane is not connected. Direct client mutations to witness_events are forbidden; authoritative transactions must route through authenticated SECURITY DEFINER RPCs.',
    };
  }

  public async confirmFulfillment(
    _seedId: string,
    _needId: string
  ): Promise<CommandResult<ParticipationSeed>> {
    return {
      success: false,
      error:
        'Supabase authority plane is not connected. Direct client mutations to witness_events are forbidden; authoritative transactions must route through authenticated SECURITY DEFINER RPCs.',
    };
  }
}
