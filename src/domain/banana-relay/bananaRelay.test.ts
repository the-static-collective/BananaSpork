import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTwelveOhOneState,
  crossSelectedDoor,
  performElfAct,
  receiptElfAct,
  selectDoor,
  witnessAtNoon,
  proposeDoor,
} from '../twelve-oh-one/twelveOhOne';
import {
  createBananaRelayPacket,
  plantRelaySeeds,
} from './bananaRelay';

function completedReceipt() {
  let state = createTwelveOhOneState();
  state = witnessAtNoon(state, 'A broken edge became visible.');
  state = proposeDoor(state, {
    id: 'door-fix',
    label: 'Fix one edge',
    targetRef: 'src/edge.ts',
  });
  state = selectDoor(state, 'door-fix');
  state = crossSelectedDoor(state, {
    kind: 'human_selection',
    doorId: 'door-fix',
  });
  state = performElfAct(state, {
    targetRef: 'src/edge.ts',
    description: 'Added the missing boundary check.',
  });
  state = receiptElfAct(state);
  return state.receipts[0];
}

test('relay fruit is derived from a real receipt instead of invented work', () => {
  const receipt = completedReceipt();
  const packet = createBananaRelayPacket(receipt);

  assert.equal(packet.sourceReceiptId, receipt.id);
  assert.equal(packet.sourceElfGeneration, receipt.elfGeneration);
  assert.deepEqual(packet.fruit, {
    sourceReceiptId: receipt.id,
    consequence: 'Added the missing boundary check.',
    targetRef: 'src/edge.ts',
    worldRevisionAfter: receipt.worldRevisionAfter,
  });
  assert.equal(packet.successorAuthority, 'none');
});

test('relay seeds are proposals with no selection or crossing authority', () => {
  const packet = createBananaRelayPacket(completedReceipt(), {
    seeds: [
      {
        id: 'seed-test',
        label: 'Add the regression test',
        targetRef: 'src/edge.test.ts',
      },
    ],
  });

  assert.deepEqual(packet.seeds[0], {
    id: 'seed-test',
    label: 'Add the regression test',
    targetRef: 'src/edge.test.ts',
    sourceReceiptId: packet.sourceReceiptId,
    relation: 'proposes',
    selectionAuthority: false,
    crossingAuthority: false,
    maxDepth: undefined,
    writeTargets: undefined,
  });
});

test('planting a seed creates only a proposed door, never a selected or crossed one', () => {
  const packet = createBananaRelayPacket(completedReceipt(), {
    seeds: [
      {
        id: 'seed-next',
        label: 'Verify the fix',
        targetRef: 'src/edge.test.ts',
      },
    ],
  });

  const witnessed = witnessAtNoon(
    createTwelveOhOneState({ worldRevision: 1, elfGeneration: 1 }),
    'The previous receipt leaves one obvious verification door.'
  );
  const planted = plantRelaySeeds(witnessed, packet);

  assert.equal(planted.stage, 'door_proposed');
  assert.equal(planted.proposedDoors.length, 1);
  assert.equal(planted.selectedDoorId, null);
  assert.equal(planted.activeElf, null);

  assert.throws(
    () => crossSelectedDoor(planted, {
      kind: 'human_selection',
      doorId: 'seed-next',
    }),
    /TWELVE_OH_ONE_CROSS_REFUSED_WITHOUT_SELECTION/
  );
});

test('a human may explicitly select a planted seed and hatch a new ELF generation', () => {
  const receipt = completedReceipt();
  const packet = createBananaRelayPacket(receipt, {
    seeds: [
      {
        id: 'seed-next',
        label: 'Verify the fix',
        targetRef: 'src/edge.test.ts',
      },
    ],
  });

  let state = witnessAtNoon(
    createTwelveOhOneState({
      worldRevision: receipt.worldRevisionAfter,
      elfGeneration: receipt.elfGeneration,
    }),
    'The receipt suggests a verification door.'
  );
  state = plantRelaySeeds(state, packet);
  state = selectDoor(state, 'seed-next');
  state = crossSelectedDoor(state, {
    kind: 'human_selection',
    doorId: 'seed-next',
  });

  assert.equal(state.activeElf?.generation, receipt.elfGeneration + 1);
  assert.equal(state.activeElf?.doorId, 'seed-next');
});

test('compost preserves failed or rejected knowledge without becoming authority', () => {
  const packet = createBananaRelayPacket(completedReceipt(), {
    compost: [
      {
        kind: 'failed_attempt',
        note: 'Tried broad mutation; it violated the write horizon.',
      },
      {
        kind: 'rejected_assumption',
        note: 'A passing build alone is not field proof.',
      },
    ],
  });

  assert.equal(packet.compost.length, 2);
  assert.equal(packet.successorAuthority, 'none');
  assert.equal(packet.seeds.length, 0);
});

test('a relay may stop cleanly with fruit and compost but no seed', () => {
  const packet = createBananaRelayPacket(completedReceipt(), {
    compost: [
      {
        kind: 'uncertainty',
        note: 'No lawful next door is clear yet.',
      },
    ],
  });

  assert.equal(packet.seeds.length, 0);
  assert.equal(packet.fruit.consequence, 'Added the missing boundary check.');
});

test('duplicate seed identities are refused', () => {
  assert.throws(
    () => createBananaRelayPacket(completedReceipt(), {
      seeds: [
        { id: 'same', label: 'First', targetRef: 'a' },
        { id: 'same', label: 'Second', targetRef: 'b' },
      ],
    }),
    /BANANA_RELAY_SEED_ID_DUPLICATE/
  );
});
