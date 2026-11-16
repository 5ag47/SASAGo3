import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { effectivePlan, lockedSlots, copyDayPreview } from '../../src/domain/schedule.js';
const fresh = () =>
  createGame({ name: '복사 테스트', character: 'boy', role: 'steady', major: 'physics' });

test('day copy changes selected days including Sunday with one revision and preserves independent slots', () => {
  const source = fresh();
  const next = transition(source, { type: 'copy_day', sourceDay: 0, days: [1, 6] });
  assert.equal(next.revision, source.revision + 1);
  for (const day of [1, 6])
    assert.deepEqual(next.plan.slice(day * 3, day * 3 + 3), source.plan.slice(0, 3));
  assert.deepEqual(next.plan.slice(6, 18), source.plan.slice(6, 18));
  assert.notEqual(next.plan[3], next.plan[0]);
  assert.notDeepEqual(source.plan.slice(3, 6), next.plan.slice(3, 6));
});

test('day copy skips fixed source and destination slots, including booked events', () => {
  const source = fresh();
  source.week = 18;
  source.flags.camp = 'heavy';
  source.flags.reservations = {
    18: [{ index: 20, activity: 'game', target: null, event: 'dorm_cards' }],
  };
  const before = effectivePlan(source);
  const next = transition(source, { type: 'copy_day', sourceDay: 0, days: [1, 6] });
  assert.deepEqual(
    copyDayPreview(source, 0, [1, 6]).map((row) => row.indices),
    [[3, 5], [18]],
  );
  for (const index of Object.keys(lockedSlots(source)))
    assert.deepEqual(effectivePlan(next)[index], before[index]);
  assert.deepEqual(next.plan[19], source.plan[19]);
  assert.equal(next.plan[18].activity, source.plan[0].activity);
});

test('malformed day copy commands cannot modify state, and schedules close at graduation', () => {
  const state = fresh();
  const before = structuredClone(state);
  for (const [sourceDay, days] of [
    [-1, [1]],
    [0, []],
    [0, [0]],
    [0, [1, 1]],
    [0, [7]],
    [0, ['1']],
    [null, [1]],
    [1, null],
  ])
    assert.throws(() => transition(state, { type: 'copy_day', sourceDay, days }), {
      code: 'COPY_DAYS_INVALID',
    });
  assert.deepEqual(state, before);
  state.week = 41;
  assert.throws(() => transition(state, { type: 'copy_day', sourceDay: 0, days: [1] }), {
    code: 'YEAR_FINISHED',
  });
});
