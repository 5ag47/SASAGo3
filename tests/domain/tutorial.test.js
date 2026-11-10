import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import {
  TUTORIAL_LESSONS,
  tutorialCompletion,
  tutorialOpen,
} from '../../src/features/year-game/tutorial.js';
import { courses, TUTORIAL_LAST_WEEK } from '../../src/domain/catalog.js';
import { balance } from '../../src/domain/balance.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { solveActiveTaskGames, runPlannedWeek } from '../helpers/task-games.js';
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
  const completed = tutorialCompletion(solveActiveTaskGames(planned));
  assert.equal(completed.schedule, true);
  assert.equal(completed.tasks, false);
  assert.equal(tutorialCompletion(runPlannedWeek(planned)).tasks, true);
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
    index: 1,
    activity: 'task',
    target: 'practice-report',
  });
  state.plan = state.plan.map((slot, index) =>
    index === 1 ? slot : { activity: 'sleep', target: null },
  );
  assert.equal(tutorialCompletion(state).tasks, false);
  state = transition(state, {
    type: 'plan',
    index: 2,
    activity: 'task',
    target: 'practice-report',
  });
  assert.equal(tutorialCompletion(state).tasks, false);
  state = solveActiveTaskGames(state);
  assert.equal(tutorialCompletion(state).tasks, false);
  state = runPlannedWeek(state);
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

test('practising "한 주 진행" early does not close the lessons that are still open', () => {
  let state = solveActiveTaskGames(
    transition(createGame(profile), { type: 'choose', event: 'winter_study', option: 'friends' }),
  );
  state.plan = state.plan.map(() => ({ activity: 'sleep', target: null }));
  state = runPlannedWeek(state);
  assert.equal(state.week, 1);
  assert.equal(state.tasks['practice-report'].status, 'active', 'still practisable');
  assert.equal(state.tasks['practice-report'].deadline, TUTORIAL_LAST_WEEK);
  assert.equal(tutorialCompletion(state, ['result-read']).results, true);
  assert.equal(tutorialCompletion(state).tasks, false);
  state = transition(state, {
    type: 'plan',
    index: 1,
    activity: 'task',
    target: 'practice-report',
  });
  state = transition(state, {
    type: 'plan',
    index: 2,
    activity: 'task',
    target: 'practice-report',
  });
  state = transition(state, {
    type: 'plan',
    index: 3,
    activity: 'study',
    target: state.courses.find((id) => courses[id].ability === 'math'),
  });
  state = transition(state, { type: 'plan', index: 4, activity: 'exercise', target: null });
  state = runPlannedWeek({ ...state, pending: [] });
  const done = tutorialCompletion(state);
  assert.equal(done.tasks, true, 'finished in week 1');
  assert.equal(done.schedule, true, 'math study in week 1 counts');
  assert.equal(done.recovery, true, 'a rest slot chosen in week 1 counts');
});

test('the tutorial badge stays while lessons remain in the practice period', () => {
  const state = createGame(profile);
  assert.equal(tutorialOpen(state, 8, 8), true, 'winter week always shows it');
  assert.equal(tutorialOpen({ ...state, week: 1 }, 5, 8), true);
  assert.equal(tutorialOpen({ ...state, week: 1 }, 8, 8), false);
  assert.equal(tutorialOpen({ ...state, week: TUTORIAL_LAST_WEEK + 1 }, 5, 8), false);
});

test('saves whose practice tasks already expired get them back inside the period only', () => {
  const old = createGame(profile);
  old.week = 1;
  old.tasks['practice-report'] = {
    ...old.tasks['practice-report'],
    status: 'expired',
    deadline: 0,
    result: { module: 'pattern_v2', score: null, note: '' },
  };
  const before = structuredClone(old);
  const migrated = migrateState(old);
  assert.deepEqual(old, before, 'source untouched');
  assert.equal(migrated.tasks['practice-report'].status, 'active');
  assert.equal(migrated.tasks['practice-report'].deadline, TUTORIAL_LAST_WEEK);
  assert.equal(migrated.tasks['practice-report'].result, undefined);
  assert.ok(validateState(migrated));
  assert.deepEqual(migrateState(migrated), migrated, 'idempotent');
  const late = { ...structuredClone(old), week: TUTORIAL_LAST_WEEK + 1 };
  assert.equal(migrateState(late).tasks['practice-report'].status, 'expired');
});

test('lesson text follows the current balance numbers instead of old rules', () => {
  const text = TUTORIAL_LESSONS.map((lesson) => lesson.description + lesson.practice).join(' ');
  assert.ok(text.includes(String(balance.fatigue.tiredStress)));
  assert.ok(text.includes(balance.money.monthlyAllowance.toLocaleString()));
  assert.ok(!text.includes('25 미만'), 'old fatigue rule removed');
  assert.ok(!/한 주를 마치면 다음 주에 피로가 남/.test(text));
});
