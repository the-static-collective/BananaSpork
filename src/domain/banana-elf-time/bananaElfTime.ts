export type BananaElfMode = 'work' | 'sabbath' | 'jubilee_hold';

export type BananaElfReceiptKind =
  | 'work.completed'
  | 'sabbath.entered'
  | 'sabbath.completed'
  | 'jubilee.hold.entered'
  | 'jubilee.released';

export interface BananaElfReceipt {
  kind: BananaElfReceiptKind;
  absoluteStep: number;
  base7Step: string;
  epoch: number;
  cycleInJubilee: number;
  phaseInCycle: number;
  elfGeneration: number;
  worldRevision: number;
  reflection?: string;
  releasedClaims?: string[];
  preservedWitnesses?: string[];
}

export interface BananaElfTimeState {
  /**
   * Counts completed transitions in the experimental machine.
   *
   * 49 = seven complete 7-phase cycles and entry into Jubilee hold.
   * 50 = explicit Jubilee release into the next epoch.
   */
  absoluteStep: number;
  epoch: number;
  cycleInJubilee: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  phaseInCycle: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  elfGeneration: number;
  worldRevision: number;
  mode: BananaElfMode;
  lastReceipt: BananaElfReceipt | null;
}

export interface JubileeReleaseInput {
  releasedClaims?: readonly string[];
  preservedWitnesses?: readonly string[];
}

export interface BananaElfCountProjection {
  absolute: number;
  base7: string;
  epoch: number;
  cycleInJubilee: number;
  phaseInCycle: number;
  mode: BananaElfMode;
}

const asCycle = (value: number): BananaElfTimeState['cycleInJubilee'] =>
  value as BananaElfTimeState['cycleInJubilee'];

const asPhase = (value: number): BananaElfTimeState['phaseInCycle'] =>
  value as BananaElfTimeState['phaseInCycle'];

function makeReceipt(
  kind: BananaElfReceiptKind,
  state: Omit<BananaElfTimeState, 'lastReceipt'>,
  extra: Pick<
    BananaElfReceipt,
    'reflection' | 'releasedClaims' | 'preservedWitnesses'
  > = {}
): BananaElfReceipt {
  return {
    kind,
    absoluteStep: state.absoluteStep,
    base7Step: state.absoluteStep.toString(7),
    epoch: state.epoch,
    cycleInJubilee: state.cycleInJubilee,
    phaseInCycle: state.phaseInCycle,
    elfGeneration: state.elfGeneration,
    worldRevision: state.worldRevision,
    ...extra,
  };
}

/**
 * Experimental Banana ELF Time machine.
 *
 * This is not a calendar claim and does not assign theological authority.
 * It is a deterministic local model for testing one design hypothesis:
 * six work phases -> explicit rest -> changed world / new local elf,
 * repeated seven times -> explicit Jubilee hold -> explicit release.
 */
export function createBananaElfTimeState(): BananaElfTimeState {
  return {
    absoluteStep: 0,
    epoch: 0,
    cycleInJubilee: 1,
    phaseInCycle: 1,
    elfGeneration: 1,
    worldRevision: 0,
    mode: 'work',
    lastReceipt: null,
  };
}

export function projectBananaElfCount(
  state: BananaElfTimeState
): BananaElfCountProjection {
  return {
    absolute: state.absoluteStep,
    base7: state.absoluteStep.toString(7),
    epoch: state.epoch,
    cycleInJubilee: state.cycleInJubilee,
    phaseInCycle: state.phaseInCycle,
    mode: state.mode,
  };
}

/**
 * Complete exactly one work phase.
 *
 * Work cannot continue through Sabbath. Reaching phase 7 changes the
 * transition law: the next lawful operation is completeSabbath().
 */
export function completeWorkPhase(state: BananaElfTimeState): BananaElfTimeState {
  if (state.mode !== 'work') {
    throw new Error('BANANA_ELF_WORK_REFUSED_OUTSIDE_WORK_MODE');
  }
  if (state.phaseInCycle < 1 || state.phaseInCycle > 6) {
    throw new Error('BANANA_ELF_WORK_PHASE_INVALID');
  }

  const absoluteStep = state.absoluteStep + 1;
  const entersSabbath = state.phaseInCycle === 6;
  const phaseInCycle = asPhase(state.phaseInCycle + 1);
  const nextWithoutReceipt = {
    ...state,
    absoluteStep,
    phaseInCycle,
    mode: entersSabbath ? ('sabbath' as const) : ('work' as const),
  };

  return {
    ...nextWithoutReceipt,
    lastReceipt: makeReceipt(
      entersSabbath ? 'sabbath.entered' : 'work.completed',
      nextWithoutReceipt
    ),
  };
}

/**
 * Complete the explicit rest/reflection phase.
 *
 * Rest is not another work action. It is the only operation allowed to
 * transition out of Sabbath. On cycles 1-6 it hatches a new local ELF into a
 * changed world. On cycle 7 it stops in Jubilee hold instead of auto-resetting.
 */
export function completeSabbath(
  state: BananaElfTimeState,
  reflection = ''
): BananaElfTimeState {
  if (state.mode !== 'sabbath' || state.phaseInCycle !== 7) {
    throw new Error('BANANA_ELF_SABBATH_REFUSED_OUTSIDE_SABBATH');
  }

  const absoluteStep = state.absoluteStep + 1;
  const worldRevision = state.worldRevision + 1;

  if (state.cycleInJubilee < 7) {
    const nextWithoutReceipt = {
      ...state,
      absoluteStep,
      cycleInJubilee: asCycle(state.cycleInJubilee + 1),
      phaseInCycle: asPhase(1),
      elfGeneration: state.elfGeneration + 1,
      worldRevision,
      mode: 'work' as const,
    };

    return {
      ...nextWithoutReceipt,
      lastReceipt: makeReceipt('sabbath.completed', nextWithoutReceipt, {
        reflection,
      }),
    };
  }

  const holdWithoutReceipt = {
    ...state,
    absoluteStep,
    worldRevision,
    mode: 'jubilee_hold' as const,
  };

  return {
    ...holdWithoutReceipt,
    lastReceipt: makeReceipt('jubilee.hold.entered', holdWithoutReceipt, {
      reflection,
    }),
  };
}

/**
 * Release a Jubilee hold explicitly.
 *
 * Nothing is deleted or restored automatically. The caller may declare which
 * claims are released and which witnesses remain preserved; this function only
 * receipts those declarations and opens the next epoch.
 */
export function releaseJubilee(
  state: BananaElfTimeState,
  input: JubileeReleaseInput = {}
): BananaElfTimeState {
  if (state.mode !== 'jubilee_hold') {
    throw new Error('BANANA_ELF_JUBILEE_RELEASE_REFUSED_OUTSIDE_HOLD');
  }

  const nextWithoutReceipt = {
    ...state,
    absoluteStep: state.absoluteStep + 1,
    epoch: state.epoch + 1,
    cycleInJubilee: asCycle(1),
    phaseInCycle: asPhase(1),
    elfGeneration: state.elfGeneration + 1,
    worldRevision: state.worldRevision + 1,
    mode: 'work' as const,
  };

  return {
    ...nextWithoutReceipt,
    lastReceipt: makeReceipt('jubilee.released', nextWithoutReceipt, {
      releasedClaims: [...(input.releasedClaims ?? [])],
      preservedWitnesses: [...(input.preservedWitnesses ?? [])],
    }),
  };
}
