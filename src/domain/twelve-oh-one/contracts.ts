export type TwelveOhOneStage =
  | 'unseen'
  | 'noon'
  | 'door_proposed'
  | 'door_selected'
  | 'crossed'
  | 'acted'
  | 'receipted';

export interface TwelveOhOneWitness {
  text: string;
}

export interface ElfCapabilityHorizon {
  root: string;
  maxDepth: number;
  writeTargets: readonly string[];
  actionBudget: 1;
  spawnBudget: 0;
  promotionAuthority: false;
}

export interface DoorProposalInput {
  id: string;
  label: string;
  targetRef: string;
  maxDepth?: number;
  writeTargets?: readonly string[];
}

export interface DoorProposal {
  id: string;
  label: string;
  targetRef: string;
  horizon: ElfCapabilityHorizon;
}

export type CrossingAuthority =
  | {
      kind: 'human_selection';
      doorId: string;
    }
  | {
      kind: 'clock';
      timestamp: string;
    };

export interface BananaElfInstance {
  generation: number;
  doorId: string;
  horizon: ElfCapabilityHorizon;
  remainingActions: 0 | 1;
  status: 'active' | 'spent';
}

export interface BananaElfActInput {
  targetRef: string;
  description: string;
}

export interface BananaElfAct {
  targetRef: string;
  description: string;
  worldRevisionBefore: number;
  worldRevisionAfter: number;
}

export interface TwelveOhOneReceipt {
  id: string;
  witness: string;
  doorId: string;
  doorLabel: string;
  targetRef: string;
  elfGeneration: number;
  action: BananaElfAct;
  worldRevisionBefore: number;
  worldRevisionAfter: number;
}

export interface TwelveOhOneState {
  stage: TwelveOhOneStage;
  worldRevision: number;
  elfGeneration: number;
  witness: TwelveOhOneWitness | null;
  proposedDoors: readonly DoorProposal[];
  selectedDoorId: string | null;
  activeElf: BananaElfInstance | null;
  action: BananaElfAct | null;
  receipts: readonly TwelveOhOneReceipt[];
}
