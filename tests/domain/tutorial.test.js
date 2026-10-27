import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { tutorialCompletion } from '../../src/features/year-game/tutorial.js';
import {
  readTutorialVisits,
  tutorialStorageKey,
  writeTutorialVisits,
} from '../../src/platform/tutorial-progress.js';
const profile = { name: '연습', character: 'boy', role: 'steady', major: 'math' };
test('actively choosing a preset counts real allocations without requiring a manual-only route', () => {
  const initial = createGame(profile);
  assert.equal(tutorialCompletion(initial).schedule, false);
  const planned = transition(initial, { type: 'preset', preset: 'tasks' });
  const completed = tutorialCompletion(planned);
  assert.equal(completed.schedule, true);
  assert.equal(completed.tasks, true);
  assert.equal(completed.recovery, true);
});
test('opening a lesson is not equivalent to doing its practice', () => {
  const state = createGame(profile);
  const completed = tutorialCompletion(state, ['profile', 'calendar', 'results']);
  assert.equal(completed.profile, false);
  assert.equal(completed.calendar, false);
  assert.equal(completed.results, false);
  assert.equal(tutorialCompletion(state, ['stats', 'courses', 'calendar:4']).profile, true);
  assert.equal(tutorialCompletion(state, ['calendar:4']).calendar, true);
});
test('tutorial task progress requires two real allocations or a completed report', () => {
  let state = createGame(profile);
  state = transition(state, {
    type: 'plan',
    index: 0,
    activity: 'task',
    target: 'practice-report',
  });
  state.plan = state.plan.map((slot, index) =>
    index === 0 ? slot : { activity: 'sleep', target: null },
  );
  assert.equal(tutorialCompletion(state).tasks, false);
  state = transition(state, {
    type: 'plan',
    index: 1,
    activity: 'task',
    target: 'practice-report',
  });
  assert.equal(tutorialCompletion(state).tasks, true);
  state = transition(state, { type: 'advance' });
  assert.equal(tutorialCompletion(state).tasks, true);
  assert.equal(tutorialCompletion(state).results, false);
  assert.equal(tutorialCompletion(state, ['result-read']).results, true);
});
test('tutorial UI storage separates accounts and new games and tolerates broken storage', async () => {
  const keyA = await tutorialStorageKey('account-a', 1);
  const keyB = await tutorialStorageKey('account-b', 1);
  const restarted = await tutorialStorageKey('account-a', 5);
  assert.notEqual(keyA, keyB);
  assert.notEqual(keyA, restarted);
  assert.ok(!keyA.includes('account-a'));
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  writeTutorialVisits(keyA, ['stats', 'courses', 'invalid'], storage);
  assert.deepEqual(readTutorialVisits(keyA, storage), ['stats', 'courses']);
  assert.deepEqual(readTutorialVisits(keyB, storage), []);
  values.set(keyA, '{broken');
  assert.deepEqual(readTutorialVisits(keyA, storage), []);
  assert.doesNotThrow(() =>
    writeTutorialVisits(keyA, [], {
      setItem: () => {
        throw Error('quota');
      },
    }),
  );
});
