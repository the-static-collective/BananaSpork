import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTwelveOhOneState,
  crossSelectedDoor,
  performElfAct,
  proposeDoor,
  receiptElfAct,
  reopenAfterReceipt,
  selectDoor,
  witnessAtNoon,
} from './twelveOhOne';

function readyToSelect() {
  let state = createTwelveOhOneState();
  state = witnessAtNoon(state, 'The README needs a 12:01 executable specimen.');
  state = proposeDoor(state, {
    id: 'door-readme',
    label: 'Write the smallest executable proof',
    targetRef: 'docs/1201-door.md',
  });
  return state;
}

test('witness, proposal, selection, and crossing remain distinct', () => {
  const unseen = createTwelveOhOneState();
  const noon = witnessAtNoon(unseen, 'Something became clear.');
  const proposed = proposeDoor(noon, {
    id: 'door-1',
    label: 'Move one stone',
    targetRef: 'stone:1',
  });
  const selected = selectDoor(proposed, 'door-1');
  const crossed = crossSelectedDoor(selected, {
    kind: 'human_selection',
    doorId: 'door-1',
  });

  assert.equal(unseen.stage, 'unseen');
  assert.equal(noon.stage, 'noon');
  assert.equal(proposed.stage, 'door_proposed');
  assert.equal(proposed.selectedDoorId, null);
  assert.equal(selected.stage, 'door_selected');
  assert.equal(selected.activeElf, null);
  assert.equal(crossed.stage, 'crossed');
  assert.equal(crossed.activeElf?.remainingActions, 1);
});

test('a clock can report 12:01 but cannot cross a selected door', () => {
  const selected = selectDoor(readyToSelect(), 'door-readme');

  assert.throws(
    () => crossSelectedDoor(selected, {
      kind: 'clock',
      timestamp: '2026-09-30T12:01:00-05:00',
    }),
    /TWELVE_OH_ONE_CLOCK_HAS_NO_AUTHORITY/
  );
});

test('crossing authority must match the explicitly selected door', () => {
  const selected = selectDoor(readyToSelect(), 'door-readme');

  assert.throws(
    () => crossSelectedDoor(selected, {
      kind: 'human_selection',
      doorId: 'some-other-door',
    }),
    /TWELVE_OH_ONE_CROSS_AUTHORITY_MISMATCH/
  );
});

test('crossing hatches a bounded mortal ELF without changing the world yet', () => {
  const selected = selectDoor(readyToSelect(), 'door-readme');
  const crossed = crossSelectedDoor(selected, {
    kind: 'human_selection',
    doorId: 'door-readme',
  });

  assert.equal(crossed.worldRevision, 0);
  assert.equal(crossed.elfGeneration, 1);
  assert.equal(crossed.activeElf?.horizon.maxDepth, 2);
  assert.deepEqual(
    crossed.activeElf?.horizon.writeTargets,
    ['docs/1201-door.md']
  );
  assert.equal(crossed.activeElf?.horizon.actionBudget, 1);
  assert.equal(crossed.activeElf?.horizon.spawnBudget, 0);
  assert.equal(crossed.activeElf?.horizon.promotionAuthority, false);
});

test('the ELF can move exactly one stone and only inside its write horizon', () => {
  const selected = selectDoor(readyToSelect(), 'door-readme');
  const crossed = crossSelectedDoor(selected, {
    kind: 'human_selection',
    doorId: 'door-readme',
  });

  assert.throws(
    () => performElfAct(crossed, {
      targetRef: 'README.md',
      description: 'Sneak outside the declared target.',
    }),
    /TWELVE_OH_ONE_ACT_OUTSIDE_WRITE_HORIZON/
  );

  const acted = performElfAct(crossed, {
    targetRef: 'docs/1201-door.md',
    description: 'Write the executable 12:01 specimen.',
  });

  assert.equal(acted.stage, 'acted');
  assert.equal(acted.worldRevision, 1);
  assert.equal(acted.activeElf?.remainingActions, 0);
  assert.equal(acted.activeElf?.status, 'spent');

  assert.throws(
    () => performElfAct(acted, {
      targetRef: 'docs/1201-door.md',
      description: 'Try to take a second action.',
    }),
    /TWELVE_OH_ONE_ACT_REFUSED_WITHOUT_ACTIVE_ELF/
  );
});

test('receipt preserves evidence and terminates the local ELF', () => {
  let state = selectDoor(readyToSelect(), 'door-readme');
  state = crossSelectedDoor(state, {
    kind: 'human_selection',
    doorId: 'door-readme',
  });
  state = performElfAct(state, {
    targetRef: 'docs/1201-door.md',
    description: 'Write the executable 12:01 specimen.',
  });
  state = receiptElfAct(state);

  assert.equal(state.stage, 'receipted');
  assert.equal(state.activeElf, null);
  assert.equal(state.receipts.length, 1);
  assert.equal(state.receipts[0].id, '12:01:1:1');
  assert.equal(state.receipts[0].elfGeneration, 1);
  assert.equal(state.receipts[0].worldRevisionBefore, 0);
  assert.equal(state.receipts[0].worldRevisionAfter, 1);
});

test('re-entry preserves receipts but hatches a new generation instead of resurrection', () => {
  let state = selectDoor(readyToSelect(), 'door-readme');
  state = crossSelectedDoor(state, {
    kind: 'human_selection',
    doorId: 'door-readme',
  });
  state = performElfAct(state, {
    targetRef: 'docs/1201-door.md',
    description: 'First crossing.',
  });
  state = receiptElfAct(state);
  state = reopenAfterReceipt(state);

  assert.equal(state.stage, 'unseen');
  assert.equal(state.worldRevision, 1);
  assert.equal(state.elfGeneration, 1);
  assert.equal(state.receipts.length, 1);

  state = witnessAtNoon(state, 'A second thing became clear.');
  state = proposeDoor(state, {
    id: 'door-2',
    label: 'Move the next stone',
    targetRef: 'stone:2',
  });
  state = selectDoor(state, 'door-2');
  state = crossSelectedDoor(state, {
    kind: 'human_selection',
    doorId: 'door-2',
  });

  assert.equal(state.elfGeneration, 2);
  assert.equal(state.activeElf?.generation, 2);
  assert.equal(state.receipts[0].elfGeneration, 1);
});
