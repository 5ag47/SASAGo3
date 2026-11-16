import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { events, courses, STATS, MAJORS } from '../../src/domain/catalog.js';
import { matchesCondition, conditionIssues } from '../../src/domain/conditions.js';
import { dispatchDayEvents } from '../../src/domain/events.js';
const fresh = () =>
  createGame({ name: '분기 검사', character: 'girl', role: 'steady', major: 'math' });
test('bounded conditions combine actual choices, course, major and stats without executable code', () => {
  const state = fresh();
  state.choices.may_union_study = 'join';
  const rule = {
    all: [
      { major: 'math' },
      { course: 'linear_algebra' },
      { choice: 'may_union_study', equals: 'join' },
      { stat: 'math', min: 20 },
    ],
  };
  assert.deepEqual(conditionIssues(rule, { courses, stats: STATS, majors: MAJORS }), []);
  assert.equal(matchesCondition(state, rule), true);
  state.choices.may_union_study = 'pass';
  assert.equal(matchesCondition(state, rule), false);
  assert.ok(conditionIssues({ stat: 'missing', min: 0 }, { stats: STATS }).length);
  let deep = { stat: 'math', min: 0 };
  for (let i = 0; i < 8; i++) deep = { not: deep };
  assert.ok(conditionIssues(deep).length);
  assert.equal(matchesCondition(state, { flag: '__proto__', equals: true }), false);
});
test('a shared scene changes available work through prior preparation and the server rejects an unavailable option', () => {
  let state = fresh();
  state.week = 26;
  state.pending = ['mock_interview'];
  assert.throws(
    () => transition(state, { type: 'choose', event: 'mock_interview', option: 'question' }),
    { code: 'OPTION_LOCKED' },
  );
  state.choices.may_union_study = 'join';
  state = transition(state, { type: 'choose', event: 'mock_interview', option: 'question' });
  assert.equal(state.choices.mock_interview, 'question');
  assert.equal(state.pending.includes('mock_interview'), false);
});
test('scheduled chance checks happen once and ineligible events do not silently reroll', () => {
  events.test_probability = {
    kind: 'notice',
    week: 0,
    name: '검증',
    description: '검증',
    chance: 0,
  };
  try {
    const state = fresh(),
      before = state.notices.length;
    events.test_probability.chance = 1;
    dispatchDayEvents(state, 0);
    assert.equal(state.notices.length, before);
    assert.equal(state.flags.eventDeliveries.test_probability, true);
  } finally {
    delete events.test_probability;
  }
});
test('a direction chosen before a rescheduled announcement is not requested twice', () => {
  let state = fresh();
  state.week = 25;
  state.pending = [];
  state = transition(state, { type: 'admission_direction', direction: 'dream' });
  dispatchDayEvents(state, 0);
  assert.equal(state.pending.includes('applications'), false);
  assert.equal(state.choices.applications, 'dream');
});
