import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { migrateState, validateState, CONTENT_VERSION } from '../../src/domain/state.js';
import { applyEffects } from '../../src/domain/random.js';
import { balance } from '../../src/domain/balance.js';
import { courseLoad } from '../../src/domain/course-load.js';
import { activityPreview } from '../../src/domain/activity-preview.js';
import { weekForecast } from '../../src/domain/week-forecast.js';
import { beginWeek } from '../../src/domain/events.js';
import { events } from '../../src/domain/catalog.js';
import { runPlannedWeek } from '../helpers/task-games.js';

const fresh = () =>
  createGame({ name: '통합 확인', character: 'girl', role: 'steady', major: 'math' });
test('concentration immediately follows health minus stress and cannot be raised independently', () => {
  const state = fresh();
  assert.equal(state.stats.focus, state.stats.hp - state.stats.stress);
  applyEffects(state, { hp: -10, stress: 30, focus: 100 });
  assert.equal(state.stats.focus, Math.round((state.stats.hp - state.stats.stress) * 10) / 10);
  applyEffects(state, { hp: -100, stress: 100 });
  assert.equal(state.stats.focus, -100);
  assert.ok(validateState(state));
  const next = transition(state, { type: 'preset', preset: 'rest' });
  assert.equal(next.stats.focus, -100);
  assert.equal(next.contentVersion, CONTENT_VERSION);
});
test('older saves derive current concentration without rewriting marks, task results or history', () => {
  const old = runPlannedWeek(fresh());
  old.contentVersion = '2026.11.02-4';
  old.stats.focus = 99;
  const before = structuredClone(old);
  const next = migrateState(old);
  assert.deepEqual(old, before);
  assert.equal(next.stats.focus, Math.round((old.stats.hp - old.stats.stress) * 10) / 10);
  for (const key of ['history', 'assessments', 'tasks', 'money', 'courses'])
    assert.deepEqual(next[key], old[key]);
  assert.deepEqual(migrateState(next), next);
  assert.ok(validateState(next));
});
test('math decays once on a completed week, never when editing or resuming notices', () => {
  let state = fresh();
  state.tasks = {};
  state.pending = [];
  state.flags.eventDeliveries = Object.fromEntries(Object.keys(events).map((id) => [id, true]));
  state = transition(state, { type: 'preset', preset: 'rest' });
  const before = state.stats.math;
  const next = runPlannedWeek(state);
  assert.equal(next.stats.math, Math.round((before - balance.weekly.mathDecay) * 10) / 10);
  assert.equal(state.stats.math, before);
  const edited = transition(next, { type: 'preset', preset: 'rest' });
  assert.equal(edited.stats.math, next.stats.math);
});
test('subject burden is shared by study and task slots and previews never commit it', () => {
  const state = fresh();
  state.tasks.sample = { course: 'linear_algebra' };
  const math = courseLoad(state, 'study', 'linear_algebra');
  const language = courseLoad(state, 'study', 'foreign_language');
  assert.ok(math.stress > language.stress);
  assert.ok(math.hp < 0 && language.hp < 0);
  assert.deepEqual(courseLoad(state, 'task', 'sample'), math);
  const before = structuredClone(state);
  const preview = activityPreview(state, 'study', 'linear_algebra');
  assert.ok(preview.effects.hp < 0 && preview.effects.stress > 0);
  weekForecast(state);
  assert.deepEqual(state, before);
});
test('ported events are delivered once and chemistry events stay course-specific', () => {
  const state = fresh();
  state.week = 3;
  beginWeek(state);
  assert.ok(
    !state.notices.some((notice) => notice.title === events.testdy_chemistry_quiz_review.name),
  );
  state.week = 6;
  beginWeek(state);
  const reputation = state.stats.reputation;
  beginWeek(state);
  assert.equal(state.stats.reputation, reputation);
  assert.equal(
    state.notices.filter((notice) => notice.title === events.testdy_lost_property.name).length,
    1,
  );
});

test('legacy pending re-enrollment is cleared while current enrollment and records remain', () => {
  const old = fresh();
  old.week = 12;
  old.pending = ['second_registration'];
  old.nextMajor = 'biology';
  const next = migrateState(old);
  assert.deepEqual(next.pending, []);
  assert.deepEqual(next.courses, old.courses);
  assert.equal(next.major, old.major);
  assert.deepEqual(next.choices, old.choices);
  assert.deepEqual(old.pending, ['second_registration']);
  assert.deepEqual(migrateState(next), next);
});
