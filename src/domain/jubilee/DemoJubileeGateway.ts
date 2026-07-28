import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import { INITIAL_OFFERS, INITIAL_SEEDS, INITIAL_RECEIPTS } from '../../data/jubileeData';
import { buildReceiptPayload, computeSha256 } from '../../lib/crypto';
import {
  CommandResult,
  JubileeCurrentUser,
  JubileeGateway,
  JubileeState,
  RuntimeMode,
} from './contracts';

const STORAGE_KEY_OFFERS = 'jubilee_offers_v1';
const STORAGE_KEY_SEEDS = 'jubilee_seeds_v1';
const STORAGE_KEY_RECEIPTS = 'jubilee_receipts_v1';

export class DemoJubileeGateway implements JubileeGateway {
  private offers: BasketOffer[];
  private seeds: ParticipationSeed[];
  private receipts: WitnessReceipt[];
  private currentUser: JubileeCurrentUser;
  private listeners: Set<(state: JubileeState) => void> = new Set();

  constructor(currentUser?: JubileeCurrentUser) {
    this.currentUser = currentUser || {
      id: 'local-member-1',
      name: 'Local Member (You)',
      role: 'Co-Parent',
    };

    this.offers = this.loadFromStorage(STORAGE_KEY_OFFERS, INITIAL_OFFERS);
    this.seeds = this.loadFromStorage(STORAGE_KEY_SEEDS, INITIAL_SEEDS);
    this.receipts = this.loadFromStorage(STORAGE_KEY_RECEIPTS, INITIAL_RECEIPTS);
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`[DemoJubileeGateway] Failed to read ${key} from storage:`, e);
    }
    return fallback;
  }

  private saveToStorage(key: string, data: any): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.warn(`[DemoJubileeGateway] Failed to write ${key} to storage:`, e);
    }
  }

  public getRuntimeMode(): RuntimeMode {
    return 'this_device_demo';
  }

  public getState(): JubileeState {
    return {
      runtimeMode: this.getRuntimeMode(),
      offers: [...this.offers],
      seeds: [...this.seeds],
      receipts: [...this.receipts],
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
    return [...this.offers];
  }

  public async getSeeds(): Promise<ParticipationSeed[]> {
    return [...this.seeds];
  }

  public async getReceipts(): Promise<WitnessReceipt[]> {
    return [...this.receipts];
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
    this.listeners.forEach((listener) => listener(state));
  }

  private async createDeviceActivityRecord(
    actorName: string,
    eventType: WitnessReceipt['eventType'],
    title: string,
    details: string
  ): Promise<WitnessReceipt> {
    const latest = this.receipts[0];
    const sequence = (latest?.sequence || 0) + 1;
    const predecessorHash =
      latest?.sha256Hash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const payload = buildReceiptPayload(
      sequence,
      predecessorHash,
      actorName,
      eventType,
      title,
      timestamp,
      details
    );
    const sha256Hash = await computeSha256(payload);

    const record: WitnessReceipt = {
      id: `rcpt-${sequence}`,
      sequence,
      sha256Hash,
      predecessorHash,
      actorName,
      eventType,
      title,
      timestamp,
      details: `${details} • [This-Device Demo Activity]`,
    };

    this.receipts = [record, ...this.receipts];
    this.saveToStorage(STORAGE_KEY_RECEIPTS, this.receipts);
    return record;
  }

  public async addOffer(
    offerInput: Omit<BasketOffer, 'id' | 'timestamp'>
  ): Promise<CommandResult<BasketOffer>> {
    if (!offerInput.title || !offerInput.title.trim()) {
      return { success: false, error: 'Offer title cannot be empty.' };
    }

    const offer: BasketOffer = {
      ...offerInput,
      id: `off-${Date.now()}`,
      contributorName: offerInput.contributorName || this.currentUser.name,
      timestamp: 'Just now',
    };

    this.offers = [offer, ...this.offers];
    this.saveToStorage(STORAGE_KEY_OFFERS, this.offers);

    const witnessReceipt = await this.createDeviceActivityRecord(
      offer.contributorName,
      'offer.created',
      `Created Offer: ${offer.title}`,
      `Added ${offer.category} item into shared basket. Available: ${offer.availability}`
    );

    this.notify();
    return { success: true, data: offer, witnessReceipt };
  }

  public async addSeed(
    seedInput: Omit<ParticipationSeed, 'id' | 'timestamp'>
  ): Promise<CommandResult<ParticipationSeed>> {
    if (!seedInput.title || !seedInput.title.trim()) {
      return { success: false, error: 'Seed title cannot be empty.' };
    }

    const seed: ParticipationSeed = {
      ...seedInput,
      id: `seed-${Date.now()}`,
      authorName: seedInput.authorName || this.currentUser.name,
      timestamp: 'Just now',
    };

    this.seeds = [seed, ...this.seeds];
    this.saveToStorage(STORAGE_KEY_SEEDS, this.seeds);

    const witnessReceipt = await this.createDeviceActivityRecord(
      seed.authorName,
      'seed.opened',
      `Opened Seed: ${seed.title}`,
      `Opened possibility seed with ${seed.needs.length} open needs.`
    );

    this.notify();
    return { success: true, data: seed, witnessReceipt };
  }

  public async pledgeNeed(
    seedId: string,
    needId: string,
    pledgedBy?: string
  ): Promise<CommandResult<ParticipationSeed>> {
    const seedIndex = this.seeds.findIndex((s) => s.id === seedId);
    if (seedIndex === -1) {
      return {
        success: false,
        error: `Invalid Seed ID "${seedId}". Seed not found in local state.`,
      };
    }

    const targetSeed = this.seeds[seedIndex];
    const need = targetSeed.needs.find((n) => n.id === needId);

    if (!need) {
      return {
        success: false,
        error: `Invalid Need ID "${needId}" for Seed "${seedId}". Need not found in seed.`,
      };
    }

    if (need.status !== 'open') {
      return {
        success: false,
        error: `Need "${need.title}" is already ${need.status}. Only open needs can be pledged.`,
      };
    }

    const actor = pledgedBy || this.currentUser.name;
    const updatedNeeds = targetSeed.needs.map((n) =>
      n.id === needId ? { ...n, pledgedBy: actor, status: 'pledged' as const } : n
    );

    const updatedSeed: ParticipationSeed = {
      ...targetSeed,
      needs: updatedNeeds,
      stage: targetSeed.stage === 'Seed' ? 'Sprout' : targetSeed.stage,
    };

    this.seeds[seedIndex] = updatedSeed;
    this.saveToStorage(STORAGE_KEY_SEEDS, this.seeds);

    const witnessReceipt = await this.createDeviceActivityRecord(
      actor,
      'pledge.submitted',
      `Pledged Need: ${need.title}`,
      `${actor} pledged to fulfill need "${need.title}" for seed "${targetSeed.title}".`
    );

    this.notify();
    return { success: true, data: updatedSeed, witnessReceipt };
  }

  public async confirmFulfillment(
    seedId: string,
    needId: string
  ): Promise<CommandResult<ParticipationSeed>> {
    const seedIndex = this.seeds.findIndex((s) => s.id === seedId);
    if (seedIndex === -1) {
      return {
        success: false,
        error: `Invalid Seed ID "${seedId}". Seed not found in local state.`,
      };
    }

    const targetSeed = this.seeds[seedIndex];
    const need = targetSeed.needs.find((n) => n.id === needId);

    if (!need) {
      return {
        success: false,
        error: `Invalid Need ID "${needId}" for Seed "${seedId}". Need not found in seed.`,
      };
    }

    if (need.status !== 'pledged') {
      return {
        success: false,
        error: `Need "${need.title}" status is "${need.status}". Only pledged needs can be confirmed.`,
      };
    }

    const actor = need.pledgedBy || this.currentUser.name;
    const updatedNeeds = targetSeed.needs.map((n) =>
      n.id === needId ? { ...n, status: 'confirmed' as const } : n
    );

    const updatedSeed: ParticipationSeed = {
      ...targetSeed,
      needs: updatedNeeds,
      stage: 'Growing' as const,
    };

    this.seeds[seedIndex] = updatedSeed;
    this.saveToStorage(STORAGE_KEY_SEEDS, this.seeds);

    const witnessReceipt = await this.createDeviceActivityRecord(
      actor,
      'fulfillment.confirmed',
      `Fulfillment Confirmed: ${need.title}`,
      `Confirmed delivery/fulfillment of "${need.title}" for seed "${targetSeed.title}".`
    );

    this.notify();
    return { success: true, data: updatedSeed, witnessReceipt };
  }
}
