import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeSabbath,
  completeWorkPhase,
  createBananaElfTimeState,
  projectBananaElfCount,
  releaseJubilee,
  type BananaElfTimeState,
} from './bananaElfTime';

function runToSabbath(state: BananaElfTimeState): BananaElfTimeState {
  let next = state;
  while (next.mode === 'work') {
    next = completeWorkPhase(next);
  }
  return next;
}

test('six work completions enter Sabbath and refuse ordinary work', () => {
  const sabbath = runToSabbath(createBananaElfTimeState());

  assert.equal(sabbath.phaseInCycle, 7);
  assert.equal(sabbath.mode, 'sabbath');
  assert.equal(sabbath.absoluteStep, 6);
  assert.equal(sabbath.lastReceipt?.kind, 'sabbath.entered');
  assert.throws(
    () => completeWorkPhase(sabbath),
    /BANANA_ELF_WORK_REFUSED_OUTSIDE_WORK_MODE/
  );
});

test('Sabbath returns to phase 1 without restoring the old world or old elf', () => {
  const initial = createBananaElfTimeState();
  const sabbath = runToSabbath(initial);
  const returned = completeSabbath(sabbath, 'keep the receipt; compost the failed guess');

  assert.equal(initial.phaseInCycle, 1);
  assert.equal(returned.phaseInCycle, 1);
  assert.equal(returned.mode, 'work');

  assert.notEqual(returned.elfGeneration, initial.elfGeneration);
  assert.notEqual(returned.worldRevision, initial.worldRevision);
  assert.equal(returned.cycleInJubilee, 2);
  assert.equal(returned.absoluteStep, 7);
  assert.equal(returned.lastReceipt?.kind, 'sabbath.completed');
  assert.equal(
    returned.lastReceipt?.reflection,
    'keep the receipt; compost the failed guess'
  );
});

test('seven Sabbath cycles stop at step 49 in explicit Jubilee hold', () => {
  let state = createBananaElfTimeState();

  for (let cycle = 1; cycle <= 7; cycle += 1) {
    state = runToSabbath(state);
    state = completeSabbath(state, `cycle-${cycle}-reflection`);
  }

  assert.equal(state.mode, 'jubilee_hold');
  assert.equal(state.absoluteStep, 49);
  assert.equal(projectBananaElfCount(state).base7, '100');
  assert.equal(state.cycleInJubilee, 7);
  assert.equal(state.phaseInCycle, 7);
  assert.equal(state.lastReceipt?.kind, 'jubilee.hold.entered');

  assert.throws(
    () => completeWorkPhase(state),
    /BANANA_ELF_WORK_REFUSED_OUTSIDE_WORK_MODE/
  );
  assert.throws(
    () => completeSabbath(state),
    /BANANA_ELF_SABBATH_REFUSED_OUTSIDE_SABBATH/
  );
});

test('step 50 requires explicit Jubilee release and opens a changed epoch', () => {
  let state = createBananaElfTimeState();

  for (let cycle = 1; cycle <= 7; cycle += 1) {
    state = runToSabbath(state);
    state = completeSabbath(state);
  }

  const heldWorldRevision = state.worldRevision;
  const heldGeneration = state.elfGeneration;

  state = releaseJubilee(state, {
    releasedClaims: ['temporary-hold:example'],
    preservedWitnesses: ['receipt:example'],
  });

  assert.equal(state.absoluteStep, 50);
  assert.equal(projectBananaElfCount(state).base7, '101');
  assert.equal(state.epoch, 1);
  assert.equal(state.cycleInJubilee, 1);
  assert.equal(state.phaseInCycle, 1);
  assert.equal(state.mode, 'work');
  assert.equal(state.elfGeneration, heldGeneration + 1);
  assert.equal(state.worldRevision, heldWorldRevision + 1);
  assert.deepEqual(state.lastReceipt?.releasedClaims, ['temporary-hold:example']);
  assert.deepEqual(state.lastReceipt?.preservedWitnesses, ['receipt:example']);
});

test('Jubilee release is unavailable before the world reaches its hold', () => {
  assert.throws(
    () => releaseJubilee(createBananaElfTimeState()),
    /BANANA_ELF_JUBILEE_RELEASE_REFUSED_OUTSIDE_HOLD/
  );
});

test('count projections keep absolute count, base-7 count, and local phase distinct', () => {
  let state = createBananaElfTimeState();

  for (let cycle = 1; cycle <= 7; cycle += 1) {
    state = runToSabbath(state);
    state = completeSabbath(state);
  }

  const projection = projectBananaElfCount(state);
  assert.deepEqual(projection, {
    absolute: 49,
    base7: '100',
    epoch: 0,
    cycleInJubilee: 7,
    phaseInCycle: 7,
    mode: 'jubilee_hold',
  });
});
