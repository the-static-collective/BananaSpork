import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';

export type RuntimeMode = 'shared_campfire' | 'this_device_demo';

export interface JubileeCurrentUser {
  id: string;
  name: string;
  role: string;
}

export interface JubileeState {
  runtimeMode: RuntimeMode;
  offers: BasketOffer[];
  seeds: ParticipationSeed[];
  receipts: WitnessReceipt[];
  currentUser: JubileeCurrentUser;
}

export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  witnessReceipt?: WitnessReceipt;
}

export interface JubileeGateway {
  getRuntimeMode(): RuntimeMode;
  getState(): JubileeState;
  getOffers(): Promise<BasketOffer[]>;
  getSeeds(): Promise<ParticipationSeed[]>;
  getReceipts(): Promise<WitnessReceipt[]>;
  refresh(): Promise<void>;
  
  addOffer(offer: Omit<BasketOffer, 'id' | 'timestamp'>): Promise<CommandResult<BasketOffer>>;
  addSeed(seed: Omit<ParticipationSeed, 'id' | 'timestamp'>): Promise<CommandResult<ParticipationSeed>>;
  pledgeNeed(seedId: string, needId: string, pledgedBy?: string): Promise<CommandResult<ParticipationSeed>>;
  acceptPledgedOffer(offerId: string): Promise<CommandResult>;
  declinePledgedOffer(offerId: string, reason?: string): Promise<CommandResult>;
  reportFulfillmentAction(offerId: string, note?: string): Promise<CommandResult>;
  confirmFulfillment(seedId: string, needId: string): Promise<CommandResult<ParticipationSeed>>;
  
  setCurrentUser(user: JubileeCurrentUser): void;
  setActiveCircleId(circleId?: string): void;
  subscribe(listener: (state: JubileeState) => void): () => void;
}
