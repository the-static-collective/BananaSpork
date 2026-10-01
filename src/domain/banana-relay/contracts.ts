import type { DoorProposalInput, TwelveOhOneReceipt } from '../twelve-oh-one/contracts';

export type RelayCompostKind =
  | 'rejected_assumption'
  | 'failed_attempt'
  | 'dead_path'
  | 'uncertainty';

export interface RelayFruit {
  sourceReceiptId: string;
  consequence: string;
  targetRef: string;
  worldRevisionAfter: number;
}

export interface RelaySeed {
  id: string;
  label: string;
  targetRef: string;
  sourceReceiptId: string;
  relation: 'proposes';
  selectionAuthority: false;
  crossingAuthority: false;
  maxDepth?: number;
  writeTargets?: readonly string[];
}

export interface RelayCompost {
  kind: RelayCompostKind;
  note: string;
}

export interface BananaRelayPacket {
  sourceReceiptId: string;
  sourceElfGeneration: number;
  fruit: RelayFruit;
  seeds: readonly RelaySeed[];
  compost: readonly RelayCompost[];
  successorAuthority: 'none';
}

export interface BananaRelayInput {
  seeds?: readonly Omit<
    RelaySeed,
    'sourceReceiptId' | 'relation' | 'selectionAuthority' | 'crossingAuthority'
  >[];
  compost?: readonly RelayCompost[];
}

export function relaySeedToDoorProposal(seed: RelaySeed): DoorProposalInput {
  return {
    id: seed.id,
    label: seed.label,
    targetRef: seed.targetRef,
    maxDepth: seed.maxDepth,
    writeTargets: seed.writeTargets,
  };
}

export function isReceiptedConsequence(
  receipt: TwelveOhOneReceipt | null | undefined
): receipt is TwelveOhOneReceipt {
  return Boolean(
    receipt &&
      receipt.id &&
      receipt.action &&
      receipt.action.description &&
      receipt.targetRef &&
      receipt.worldRevisionAfter > receipt.worldRevisionBefore
  );
}
