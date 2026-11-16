import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { assignments, assignmentEvents, courses, STATS } from '../../src/domain/catalog.js';
import { assignmentIssues, expandAssignments, taskStages } from '../../src/domain/assignments.js';
import { buildAssignmentPatch, applyAssignmentPatch } from '../../src/domain/assignment-edits.js';
import { taskModule, taskGameReady } from '../../src/domain/task-modules/registry.js';
import { addTask, workTask, expireTasks } from '../../src/domain/tasks.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { publicTasks } from '../../src/domain/task-processing.js';
import { solveTaskGame, runPlannedWeek } from '../helpers/task-games.js';
const context = { courses, stats: STATS };
const definition = {
  kind: 'task',
  name: '검증용 과제',
  description: '',
  week: 1,
  deadline: 3,
  target: 2,
  reward: { math: 2 },
  penalty: { stress: 2 },
};
const fresh = () =>
  createGame({ name: '모듈 검증', character: 'boy', role: 'steady', major: 'math' });
const move = (state, task, action) => transition(state, { type: 'task_game', task, action });
function atWork(state, task, slots = 1) {
  state.plan = Array.from({ length: 21 }, (_, i) =>
    i < slots ? { activity: 'task', target: task } : { activity: 'sleep', target: null },
  );
  return transition(state, { type: 'advance' });
}

test('all authored tasks and runtime tutorial tasks have playable modules', () => {
  assert.equal(
    Object.keys(assignments).filter((id) => assignments[id].kind === 'task').length,
    100,
  );
  for (const task of Object.values(assignmentEvents)) assert.ok(taskModule(task).game, task.name);
  for (const task of Object.values(fresh().tasks))
    assert.ok(
      task.special === 'tutorial' ? task.module.id === 'time_v1' : taskModule(task).game,
      task.id,
    );
  assert.equal(assignmentIssues(assignments, context).length, 0);
});
test('individual module overrides group modules; conflicting groups fail before application', () => {
  const defs = {
    first_task: { ...definition },
    second_task: { ...definition },
    shared_group: {
      kind: 'group',
      name: '공유',
      members: ['first_task', 'second_task'],
      module: { id: 'order_v1', params: {} },
    },
  };
  assert.equal(expandAssignments(defs).first_task.module.id, 'order_v1');
  defs.first_task.module = { id: 'pattern_v1', params: {} };
  assert.equal(expandAssignments(defs).first_task.module.id, 'pattern_v1');
  defs.other_group = {
    kind: 'group',
    name: '충돌',
    members: ['second_task'],
    module: { id: 'pattern_v1', params: {} },
  };
  assert.ok(assignmentIssues(defs, context).some((issue) => issue.includes('충돌')));
  defs.second_task.module = { id: 'order_v1', params: {} };
  assert.deepEqual(assignmentIssues(defs, context), []);
});
test('invalid module IDs, parameters, stages and repeat deadlines report exact fields', () => {
  const defs = {
    invalid_task: {
      ...definition,
      module: { id: '../../execute', params: {} },
      stages: [{ id: 'stage_a', name: '검증', target: 1 }],
      repeat: { every: 1, until: 40 },
    },
  };
  const errors = assignmentIssues(defs, context);
  for (const field of ['module', 'stages', 'repeat'])
    assert.ok(errors.some((error) => error.startsWith(`invalid_task.${field}:`)));
});
test('repeated assignments get separate IDs, snapshots and mini-game data', () => {
  const defs = { repeat_task: { ...definition, repeat: { every: 2, until: 5 }, deadline: 2 } };
  const expanded = expandAssignments(defs);
  assert.deepEqual(Object.keys(expanded), ['repeat_task', 'repeat_task--w3', 'repeat_task--w5']);
  let state = fresh();
  addTask(state, 'repeat_task', expanded.repeat_task);
  addTask(state, 'repeat_task--w3', expanded['repeat_task--w3']);
  state = atWork(state, 'repeat_task');
  state = move(state, 'repeat_task', { type: 'start' });
  assert.equal(state.tasks['repeat_task--w3'].moduleData, undefined);
  assert.notEqual(state.tasks.repeat_task.module, state.tasks['repeat_task--w3'].module);
});
test('order module survives reload, penalizes mistakes, and does not grant progress before scheduled work', () => {
  let state = fresh();
  addTask(state, 'ordered_task', { ...definition, module: { id: 'order_v1', params: {} } });
  const messages = [];
  state = atWork(state, 'ordered_task', 2);
  const money = state.money;
  workTask(state, 'ordered_task', messages);
  assert.equal(state.tasks.ordered_task.progress, 0);
  state = move(state, 'ordered_task', { type: 'start' });
  const cards = [...state.tasks.ordered_task.moduleData.cards].sort((a, b) => a - b);
  state = move(state, 'ordered_task', { type: 'pick', card: cards[3] });
  assert.equal(state.tasks.ordered_task.moduleData.mistakes, 1);
  assert.throws(() => move(state, 'ordered_task', { type: 'pick', card: 99 }), {
    code: 'TASK_GAME_ACTION',
  });
  state = migrateState(JSON.parse(JSON.stringify(state)));
  state = solveTaskGame(state, 'ordered_task');
  assert.equal(state.tasks.ordered_task.attempts.lastQuality, 90);
  assert.equal(state.tasks.ordered_task.progress, 1);
  state = transition(state, { type: 'advance' });
  state = solveTaskGame(state, 'ordered_task');
  assert.equal(state.tasks.ordered_task.status, 'completed');
  const math = state.stats.math;
  workTask(state, 'ordered_task', messages);
  assert.equal(state.stats.math, math);
  assert.equal(state.money, money);
  assert.ok(validateState(state));
});
test('pattern module hides the target after preview and rejects submitted pass or score fields', () => {
  let state = move(atWork(fresh(), 'practice-report'), 'practice-report', { type: 'start' });
  const goal = [...state.tasks['practice-report'].moduleData.goal];
  assert.deepEqual(publicTasks(state.tasks)['practice-report'].moduleData.goal, goal);
  state = move(state, 'practice-report', { type: 'ready' });
  assert.equal(publicTasks(state.tasks)['practice-report'].moduleData.goal, null);
  assert.throws(() => move(state, 'practice-report', { type: 'check', passed: true, score: 100 }), {
    code: 'TASK_GAME_ACTION',
  });
  for (const cell of goal) state = move(state, 'practice-report', { type: 'toggle', cell });
  state = move(state, 'practice-report', { type: 'check' });
  assert.equal(state.tasks['practice-report'].progress, 1);
  assert.equal(state.weekRun.waiting.kind, 'task_result');
  assert.throws(() => move(state, 'practice-report', { type: 'start' }), {
    code: 'TASK_TIME_REQUIRED',
  });
});
test('stages advance with work after the game; expiry and completion rewards cannot repeat', () => {
  let state = fresh();
  addTask(state, 'staged_task', {
    ...definition,
    stages: [
      { id: 'first_step', name: '앞 단계', target: 1 },
      { id: 'last_step', name: '뒤 단계', target: 1 },
    ],
  });
  state = solveTaskGame(atWork(state, 'staged_task'), 'staged_task');
  assert.deepEqual(
    taskStages(state.tasks.staged_task).map((stage) => stage.status),
    ['completed', 'active'],
  );
  state = runPlannedWeek(state);
  state.week = 3;
  expireTasks(state, []);
  const stress = state.stats.stress;
  expireTasks(state, []);
  assert.equal(state.stats.stress, stress);
  assert.equal(state.tasks.staged_task.status, 'expired');
});
test('old active saves retain progress and grades while gaining game modules once', () => {
  const old = fresh();
  delete old.flags.taskGamesVersion;
  old.tasks['practice-report'].progress = 1;
  delete old.tasks['practice-report'].module;
  const next = migrateState(old);
  assert.equal(next.tasks['practice-report'].progress, 1);
  assert.ok(taskModule(next.tasks['practice-report']).game);
  assert.deepEqual(next.assessments, old.assessments);
  assert.equal(old.tasks['practice-report'].module, undefined);
});
test('edit patches preserve others work, reject same-record conflicts and validate the whole result', () => {
  const base = { first_task: { ...definition }, second_task: { ...definition } };
  const edited = structuredClone(base);
  edited.first_task.name = '내 수정';
  const patch = buildAssignmentPatch(base, edited);
  const latest = structuredClone(base);
  latest.second_task.name = '동료 수정';
  assert.equal(applyAssignmentPatch(latest, patch, context).next.second_task.name, '동료 수정');
  latest.first_task.target = 4;
  const conflict = applyAssignmentPatch(latest, patch, context);
  assert.deepEqual(conflict.conflicts, ['first_task']);
  assert.equal(conflict.next, null);
  assert.equal(
    applyAssignmentPatch(
      base,
      { version: 1, changes: JSON.parse('{"__proto__":{"before":null,"after":{}}}') },
      context,
    ).next,
    null,
  );
});
