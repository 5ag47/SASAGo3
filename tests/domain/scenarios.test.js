import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import {
  scenarios,
  scenarioEvents,
  courses,
  STATS,
  MAJORS,
  events,
} from '../../src/domain/catalog.js';
import { scenarioIssues, expandScenarios } from '../../src/domain/scenarios.js';
import { dispatchDayEvents } from '../../src/domain/events.js';
import { addTask, workTask, expireTasks } from '../../src/domain/tasks.js';
import { migrateState, validateState, CONTENT_VERSION } from '../../src/domain/state.js';
import { runPlannedWeek } from '../helpers/task-games.js';
import { taskEstimate } from '../../src/domain/task-modules/registry.js';

const context = { courses, stats: STATS, majors: MAJORS };
const reportId = 'project-2-general_physics';
const fresh = (major = 'math') =>
  createGame({ name: 'JSON 검증', character: 'boy', role: 'steady', major }, 1234);

test('a choice at day end pauses before the following day and is delivered exactly once', (t) => {
  events.test_end_choice = {
    ...structuredClone(scenarioEvents.story_delivery),
    week: 3,
    day: 0,
    phase: 'end',
  };
  t.after(() => {
    delete events.test_end_choice;
  });
  let state = fresh();
  state.week = 3;
  state.pending = [];
  state.flags.eventDeliveries = Object.fromEntries(
    Object.keys(events)
      .filter((id) => id !== 'test_end_choice')
      .map((id) => [id, true]),
  );
  state.plan = Array.from({ length: 21 }, () => ({ activity: 'sleep', target: null }));
  state = transition(state, { type: 'advance' });
  assert.equal(state.weekRun.cursor, 3);
  assert.equal(state.weekRun.lastDay, 0);
  assert.equal(state.weekRun.waiting.event, 'test_end_choice');
  state = transition(state, { type: 'choose', event: 'test_end_choice', option: 'skip' });
  state = transition(state, { type: 'advance' });
  assert.equal(state.choices.test_end_choice, 'skip');
  assert.ok(!state.pending.includes('test_end_choice'));
});

test('the editable content contract is valid and compilation never mutates content', () => {
  const before = structuredClone(scenarios);
  assert.deepEqual(scenarioIssues(scenarios, context), []);
  const compiled = expandScenarios(scenarios);
  compiled[reportId].work.perAction.progress = 99;
  assert.deepEqual(scenarios, before);
  assert.equal(Object.keys(compiled).length, 7);
  assert.equal(compiled['room_check--w16'].phase, 'end');
});

test('malformed or executable content is rejected rather than interpreted', () => {
  const changes = [
    (c) => {
      c.schemaVersion = 100;
    },
    (c) => {
      c.events[reportId].scope = 'unknown';
    },
    (c) => {
      c.events[reportId].courseId = 'missing';
    },
    (c) => {
      c.events[reportId].trigger.when = { eval: 'process.exit()' };
    },
    (c) => {
      c.events[reportId].trigger.probability = 1.1;
    },
    (c) => {
      c.events[reportId].trigger.repeatEvery = 0;
    },
    (c) => {
      c.events[reportId].deadline.week = 1;
    },
    (c) => {
      c.events[reportId].work.perAction.timeSlots = 0;
    },
    (c) => {
      c.events[reportId].work.perAction.cost.money = -1;
    },
    (c) => {
      c.events[reportId].resolution.rule = 'eval';
    },
    (c) => {
      c.events[reportId].grade.kind = 'missing';
    },
    (c) => {
      c.events.story_delivery.options = [null];
    },
    (c) => {
      c.events.story_delivery.options[0].chanceResult.code = 'malicious';
    },
    (c) => {
      c.events.room_check.outcomes = [null];
    },
  ];
  for (const mutate of changes) {
    const content = structuredClone(scenarios);
    mutate(content);
    assert.ok(scenarioIssues(content, context).length, String(mutate));
  }
});

test('course scope, date and occurrence receipts gate task delivery', () => {
  const state = fresh();
  state.week = 2;
  dispatchDayEvents(state, 0);
  assert.equal(state.tasks[reportId], undefined);
  state.week = 3;
  dispatchDayEvents(state, 0);
  assert.equal(state.tasks[reportId].target, 3);
  assert.equal(state.tasks[reportId].deadline, 5);
  workTask(state, reportId, []);
  dispatchDayEvents(state, 0);
  assert.equal(state.tasks[reportId].progress, 1);
  const biology = fresh('biology');
  biology.week = 3;
  dispatchDayEvents(biology, 0);
  assert.equal(biology.tasks[reportId], undefined);
});

test('three JSON work slots charge configured effects once and record the assessment', () => {
  const state = fresh(),
    beforeContent = JSON.stringify(scenarios);
  state.week = 3;
  addTask(state, reportId, scenarioEvents[reportId]);
  const hp = state.stats.hp,
    stress = state.stats.stress,
    rep = state.stats.reputation;
  for (let i = 0; i < 3; i++) workTask(state, reportId, []);
  assert.equal(state.tasks[reportId].status, 'completed');
  assert.equal(state.stats.hp, hp - 6);
  assert.equal(state.stats.stress, stress + 6);
  // Positive growth follows the game's diminishing-return curve.
  assert.equal(state.stats.reputation, rep + 0.9);
  const grade = state.assessments.find((a) => a.id === reportId);
  assert.equal(grade.assessmentId, 'physics_lab_report_01');
  assert.equal(grade.kind, 'project');
  assert.ok(grade.score > 65 && grade.score <= 100);
  assert.equal(workTask(state, reportId, []), false);
  assert.equal(state.assessments.filter((a) => a.id === reportId).length, 1);
  assert.equal(JSON.stringify(scenarios), beforeContent);
  assert.ok(validateState(state));
});

test('multi-slot work divides time, money and effects; insufficient money does not advance progress', () => {
  const state = fresh(),
    definition = structuredClone(scenarioEvents[reportId]);
  definition.work.perAction.timeSlots = 2;
  definition.work.perAction.cost.money = 100;
  addTask(state, 'cost_report', definition);
  assert.equal(taskEstimate(state, state.tasks.cost_report), 6);
  state.money = 49;
  const before = structuredClone(state.stats);
  assert.equal(workTask(state, 'cost_report', []), false);
  assert.equal(state.tasks.cost_report.progress, 0);
  assert.deepEqual(state.stats, before);
  state.money = 100;
  workTask(state, 'cost_report', []);
  assert.equal(state.tasks.cost_report.progress, 0.5);
  assert.equal(state.money, 50);
  assert.equal(state.stats.hp, before.hp - 1);
  workTask(state, 'cost_report', []);
  assert.equal(state.tasks.cost_report.progress, 1);
  assert.equal(state.money, 0);
});

test('JSON deadline expires at the specified day end and partial credit is recorded once', () => {
  const state = fresh();
  addTask(state, reportId, scenarioEvents[reportId]);
  workTask(state, reportId, []);
  state.week = 5;
  expireTasks(state, [], 5);
  assert.equal(state.tasks[reportId].status, 'active');
  const rep = state.stats.reputation;
  expireTasks(state, [], 6);
  assert.equal(state.tasks[reportId].status, 'expired');
  assert.equal(state.stats.reputation, rep - 3);
  assert.equal(state.assessments.find((a) => a.id === reportId).score, 18);
  expireTasks(state, [], 6);
  assert.equal(state.assessments.filter((a) => a.id === reportId).length, 1);
});

test('end-of-day natural events use prior actions and do not run at the start of day', () => {
  const state = fresh();
  state.week = 4;
  state.stats.reputation = 70;
  const stress = state.stats.stress;
  dispatchDayEvents(state, 6, 'start', scenarioEvents);
  assert.equal(state.stats.stress, stress);
  dispatchDayEvents(state, 6, 'end', scenarioEvents);
  assert.equal(state.stats.stress, stress - 2);
  dispatchDayEvents(state, 6, 'end', scenarioEvents);
  assert.equal(state.stats.stress, stress - 2);
});

test('probability and random assessment scores are reproducible from saved seed', () => {
  const definition = structuredClone(scenarios);
  definition.events.room_check.trigger.probability = 0.37;
  const compiled = expandScenarios(definition),
    a = fresh(),
    b = fresh();
  for (const state of [a, b]) {
    state.week = 4;
    dispatchDayEvents(state, 6, 'end', compiled);
    state.week = 5;
    dispatchDayEvents(state, 2, 'start', compiled);
  }
  assert.deepEqual(a, b);
  assert.equal(
    a.assessments.filter((x) => x.id === 'physics_check_quiz:physics_check_quiz_01').length,
    1,
  );
  const content = structuredClone(scenarios);
  content.events.room_check.trigger.probability = 0;
  const c = fresh();
  c.week = 4;
  dispatchDayEvents(c, 6, 'end', expandScenarios(content));
  assert.equal(c.stats.stress, fresh().stats.stress);
});

test('JSON choices enforce costs, apply their seeded result and remain resolved after saving', () => {
  let state = fresh();
  state.week = 14;
  state.pending = [];
  dispatchDayEvents(state, 0, 'start', scenarioEvents);
  state.money = 2000;
  assert.throws(() =>
    transition(state, { type: 'choose', event: 'story_delivery', option: 'try' }),
  );
  state.money = 5000;
  const before = structuredClone(state);
  state = transition(state, { type: 'choose', event: 'story_delivery', option: 'try' });
  assert.equal(state.money, 2000);
  assert.deepEqual(
    state,
    transition(before, { type: 'choose', event: 'story_delivery', option: 'try' }),
  );
  const loaded = migrateState(JSON.parse(JSON.stringify(state)));
  dispatchDayEvents(loaded, 0, 'start', scenarioEvents);
  assert.ok(!loaded.pending.includes('story_delivery'));
});

test('migration preserves existing report snapshots, completed grades and the seed', () => {
  const state = fresh();
  state.week = 3;
  addTask(state, reportId, { ...scenarioEvents[reportId], deadline: 4, target: 5 });
  state.tasks[reportId].progress = 2;
  delete state.flags.scenarioVersion;
  state.contentVersion = '2026.11.10-hannah-1';
  const task = structuredClone(state.tasks[reportId]);
  const next = migrateState(state);
  assert.equal(next.contentVersion, CONTENT_VERSION);
  assert.equal(next.flags.scenarioVersion, 1);
  assert.deepEqual(next.tasks[reportId], task);
  assert.equal(next.seed, state.seed);
  assert.deepEqual(migrateState(next), next);
  assert.ok(validateState(next));
});

test('normal scheduled play uses JSON costs without double charging the generic task activity', () => {
  const state = fresh();
  state.week = 3;
  state.pending = [];
  addTask(state, reportId, scenarioEvents[reportId]);
  state.plan = Array.from({ length: 21 }, (_, i) =>
    i === 1 ? { activity: 'task', target: reportId } : { activity: 'sleep', target: null },
  );
  const next = runPlannedWeek(state);
  const slot = next.history.at(-1).actions.find((s) => s.index === 1);
  assert.equal(next.tasks[reportId].progress, 1);
  assert.equal(slot.delta.hp, -2);
  assert.equal(slot.delta.stress, 2);
});
