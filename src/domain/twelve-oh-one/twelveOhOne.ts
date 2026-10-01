import type {
  BananaElfAct,
  BananaElfActInput,
  CrossingAuthority,
  DoorProposal,
  DoorProposalInput,
  TwelveOhOneReceipt,
  TwelveOhOneState,
} from './contracts';

function requireText(value: string, error: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(error);
  return trimmed;
}

function findDoor(state: TwelveOhOneState, doorId: string): DoorProposal {
  const door = state.proposedDoors.find((candidate) => candidate.id === doorId);
  if (!door) throw new Error('TWELVE_OH_ONE_DOOR_NOT_FOUND');
  return door;
}

export function createTwelveOhOneState(input: {
  worldRevision?: number;
  elfGeneration?: number;
} = {}): TwelveOhOneState {
  return {
    stage: 'unseen',
    worldRevision: input.worldRevision ?? 0,
    elfGeneration: input.elfGeneration ?? 0,
    witness: null,
    proposedDoors: [],
    selectedDoorId: null,
    activeElf: null,
    action: null,
    receipts: [],
  };
}

/**
 * HIGH NOON: something has become clear enough to witness.
 *
 * Witnessing changes no world state and grants no execution authority.
 */
export function witnessAtNoon(
  state: TwelveOhOneState,
  text: string
): TwelveOhOneState {
  if (state.stage !== 'unseen') {
    throw new Error('TWELVE_OH_ONE_NOON_REFUSED_OUTSIDE_UNSEEN');
  }

  return {
    ...state,
    stage: 'noon',
    witness: { text: requireText(text, 'TWELVE_OH_ONE_WITNESS_REQUIRED') },
  };
}

/**
 * A proposal is only a nearby door. It is not selection and cannot cross itself.
 */
export function proposeDoor(
  state: TwelveOhOneState,
  input: DoorProposalInput
): TwelveOhOneState {
  if (state.stage !== 'noon' && state.stage !== 'door_proposed') {
    throw new Error('TWELVE_OH_ONE_PROPOSAL_REFUSED_OUTSIDE_NOON');
  }

  const id = requireText(input.id, 'TWELVE_OH_ONE_DOOR_ID_REQUIRED');
  if (state.proposedDoors.some((door) => door.id === id)) {
    throw new Error('TWELVE_OH_ONE_DOOR_ID_DUPLICATE');
  }

  const targetRef = requireText(
    input.targetRef,
    'TWELVE_OH_ONE_TARGET_REQUIRED'
  );
  const writeTargets =
    input.writeTargets && input.writeTargets.length > 0
      ? [...new Set(input.writeTargets.map((target) => requireText(
          target,
          'TWELVE_OH_ONE_WRITE_TARGET_REQUIRED'
        )))]
      : [targetRef];

  const door: DoorProposal = {
    id,
    label: requireText(input.label, 'TWELVE_OH_ONE_DOOR_LABEL_REQUIRED'),
    targetRef,
    horizon: {
      root: id,
      maxDepth: input.maxDepth ?? 2,
      writeTargets,
      actionBudget: 1,
      spawnBudget: 0,
      promotionAuthority: false,
    },
  };

  return {
    ...state,
    stage: 'door_proposed',
    proposedDoors: [...state.proposedDoors, door],
  };
}

/**
 * Selection is explicit. Recommendation/proposal is never treated as selection.
 */
export function selectDoor(
  state: TwelveOhOneState,
  doorId: string
): TwelveOhOneState {
  if (state.stage !== 'door_proposed') {
    throw new Error('TWELVE_OH_ONE_SELECTION_REFUSED_WITHOUT_PROPOSAL');
  }

  const door = findDoor(state, requireText(
    doorId,
    'TWELVE_OH_ONE_SELECTED_DOOR_REQUIRED'
  ));

  return {
    ...state,
    stage: 'door_selected',
    selectedDoorId: door.id,
  };
}

/**
 * 12:01: explicit crossing.
 *
 * The clock may report a timestamp, but a clock never has crossing authority.
 * Only the already-selected door can be crossed, and crossing hatches a new
 * mortal local ELF with a one-action budget.
 */
export function crossSelectedDoor(
  state: TwelveOhOneState,
  authority: CrossingAuthority
): TwelveOhOneState {
  if (authority.kind === 'clock') {
    throw new Error('TWELVE_OH_ONE_CLOCK_HAS_NO_AUTHORITY');
  }

  if (state.stage !== 'door_selected' || state.selectedDoorId === null) {
    throw new Error('TWELVE_OH_ONE_CROSS_REFUSED_WITHOUT_SELECTION');
  }

  if (authority.doorId !== state.selectedDoorId) {
    throw new Error('TWELVE_OH_ONE_CROSS_AUTHORITY_MISMATCH');
  }

  const door = findDoor(state, state.selectedDoorId);
  const generation = state.elfGeneration + 1;

  return {
    ...state,
    stage: 'crossed',
    elfGeneration: generation,
    activeElf: {
      generation,
      doorId: door.id,
      horizon: door.horizon,
      remainingActions: 1,
      status: 'active',
    },
  };
}

/**
 * The local ELF may move exactly one real stone, and only inside the selected
 * door's declared write horizon.
 */
export function performElfAct(
  state: TwelveOhOneState,
  input: BananaElfActInput
): TwelveOhOneState {
  if (state.stage !== 'crossed' || state.activeElf === null) {
    throw new Error('TWELVE_OH_ONE_ACT_REFUSED_WITHOUT_ACTIVE_ELF');
  }

  if (state.activeElf.remainingActions !== 1) {
    throw new Error('TWELVE_OH_ONE_ACTION_BUDGET_EXHAUSTED');
  }

  const targetRef = requireText(
    input.targetRef,
    'TWELVE_OH_ONE_ACT_TARGET_REQUIRED'
  );
  if (!state.activeElf.horizon.writeTargets.includes(targetRef)) {
    throw new Error('TWELVE_OH_ONE_ACT_OUTSIDE_WRITE_HORIZON');
  }

  const worldRevisionBefore = state.worldRevision;
  const worldRevisionAfter = worldRevisionBefore + 1;
  const action: BananaElfAct = {
    targetRef,
    description: requireText(
      input.description,
      'TWELVE_OH_ONE_ACT_DESCRIPTION_REQUIRED'
    ),
    worldRevisionBefore,
    worldRevisionAfter,
  };

  return {
    ...state,
    stage: 'acted',
    worldRevision: worldRevisionAfter,
    action,
    activeElf: {
      ...state.activeElf,
      remainingActions: 0,
      status: 'spent',
    },
  };
}

/**
 * Receipt turns consequence into attributable evidence and ends the local ELF.
 */
export function receiptElfAct(state: TwelveOhOneState): TwelveOhOneState {
  if (
    state.stage !== 'acted' ||
    state.activeElf === null ||
    state.action === null ||
    state.witness === null ||
    state.selectedDoorId === null
  ) {
    throw new Error('TWELVE_OH_ONE_RECEIPT_REFUSED_BEFORE_ACT');
  }

  const door = findDoor(state, state.selectedDoorId);
  const receipt: TwelveOhOneReceipt = {
    id: `12:01:${state.activeElf.generation}:${state.worldRevision}`,
    witness: state.witness.text,
    doorId: door.id,
    doorLabel: door.label,
    targetRef: state.action.targetRef,
    elfGeneration: state.activeElf.generation,
    action: state.action,
    worldRevisionBefore: state.action.worldRevisionBefore,
    worldRevisionAfter: state.action.worldRevisionAfter,
  };

  return {
    ...state,
    stage: 'receipted',
    activeElf: null,
    receipts: [...state.receipts, receipt],
  };
}

/**
 * Re-entry preserves history but does not resurrect the prior local ELF.
 */
export function reopenAfterReceipt(
  state: TwelveOhOneState
): TwelveOhOneState {
  if (state.stage !== 'receipted') {
    throw new Error('TWELVE_OH_ONE_REOPEN_REFUSED_BEFORE_RECEIPT');
  }

  return {
    ...state,
    stage: 'unseen',
    witness: null,
    proposedDoors: [],
    selectedDoorId: null,
    activeElf: null,
    action: null,
  };
}
