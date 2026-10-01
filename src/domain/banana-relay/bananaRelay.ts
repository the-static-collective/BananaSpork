import type { TwelveOhOneState, TwelveOhOneReceipt } from '../twelve-oh-one/contracts';
import { proposeDoor } from '../twelve-oh-one/twelveOhOne';
import {
  isReceiptedConsequence,
  relaySeedToDoorProposal,
  type BananaRelayInput,
  type BananaRelayPacket,
  type RelayCompost,
  type RelaySeed,
} from './contracts';

function requireText(value: string, error: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(error);
  return trimmed;
}

function normalizeSeed(
  sourceReceiptId: string,
  seed: NonNullable<BananaRelayInput['seeds']>[number]
): RelaySeed {
  return {
    id: requireText(seed.id, 'BANANA_RELAY_SEED_ID_REQUIRED'),
    label: requireText(seed.label, 'BANANA_RELAY_SEED_LABEL_REQUIRED'),
    targetRef: requireText(seed.targetRef, 'BANANA_RELAY_SEED_TARGET_REQUIRED'),
    sourceReceiptId,
    relation: 'proposes',
    selectionAuthority: false,
    crossingAuthority: false,
    maxDepth: seed.maxDepth,
    writeTargets: seed.writeTargets
      ? [...new Set(seed.writeTargets.map((target) =>
          requireText(target, 'BANANA_RELAY_WRITE_TARGET_REQUIRED')
        ))]
      : undefined,
  };
}

function normalizeCompost(compost: RelayCompost): RelayCompost {
  return {
    kind: compost.kind,
    note: requireText(compost.note, 'BANANA_RELAY_COMPOST_NOTE_REQUIRED'),
  };
}

/**
 * Convert one completed 12:01 receipt into a relay packet.
 *
 * The packet can preserve consequence, propose continuations, and preserve
 * discarded/failed knowledge. It cannot select or cross a successor door.
 */
export function createBananaRelayPacket(
  receipt: TwelveOhOneReceipt,
  input: BananaRelayInput = {}
): BananaRelayPacket {
  if (!isReceiptedConsequence(receipt)) {
    throw new Error('BANANA_RELAY_REQUIRES_RECEIPTED_CONSEQUENCE');
  }

  const seeds = (input.seeds ?? []).map((seed) =>
    normalizeSeed(receipt.id, seed)
  );

  const seenSeedIds = new Set<string>();
  for (const seed of seeds) {
    if (seenSeedIds.has(seed.id)) {
      throw new Error('BANANA_RELAY_SEED_ID_DUPLICATE');
    }
    seenSeedIds.add(seed.id);
  }

  return {
    sourceReceiptId: receipt.id,
    sourceElfGeneration: receipt.elfGeneration,
    fruit: {
      sourceReceiptId: receipt.id,
      consequence: receipt.action.description,
      targetRef: receipt.targetRef,
      worldRevisionAfter: receipt.worldRevisionAfter,
    },
    seeds,
    compost: (input.compost ?? []).map(normalizeCompost),
    successorAuthority: 'none',
  };
}

/**
 * Plant relay seeds into a fresh witnessed 12:01 state.
 *
 * This produces proposed doors only. selectedDoorId and activeElf remain null.
 * The relay therefore cannot self-propagate execution authority.
 */
export function plantRelaySeeds(
  state: TwelveOhOneState,
  packet: BananaRelayPacket
): TwelveOhOneState {
  if (packet.successorAuthority !== 'none') {
    throw new Error('BANANA_RELAY_SUCCESSOR_AUTHORITY_FORBIDDEN');
  }

  let next = state;
  for (const seed of packet.seeds) {
    if (seed.selectionAuthority || seed.crossingAuthority) {
      throw new Error('BANANA_RELAY_SEED_AUTHORITY_FORBIDDEN');
    }
    next = proposeDoor(next, relaySeedToDoorProposal(seed));
  }

  return next;
}
