import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { beginWeek } from '../../src/domain/events.js';
import { academyTasks } from '../../src/domain/tasks.js';
import { schoolRecord } from '../../src/domain/school-record.js';
import { CONTENT_VERSION, migrateState, validateState } from '../../src/domain/state.js';
import { taskModule } from '../../src/domain/task-modules/registry.js';
import { validateCommand } from '../../server/security.js';
const profile = { name: '개선판', character: 'girl', role: 'steady', major: 'math' };

test('prior GPA defaults to 4.00 and is validated by the create command in both modes', () => {
  for (const seed of [1, 2, 517]) assert.equal(createGame(profile, seed).campaign.priorGpa, 4);
  const command = { type: 'create', profile: { ...profile, priorGpa: 4.15 } };
  validateCommand(command);
  assert.equal(createGame(command.profile).campaign.priorGpa, 4.15);
  for (const priorGpa of [-0.1, 4.31, NaN, Infinity, '4.1', null])
    assert.throws(() => createGame({ ...profile, priorGpa }), { code: 'PROFILE_GPA' });
});

test('normal annual tasks have no mini-games, no extra course tasks, and one academy assignment per month', () => {
  for (const major of ['math', 'chemistry', 'biology', 'information']) {
    const state = createGame({ ...profile, major, electives: ['urban_planning'] });
    state.flags.academy = true;
    for (let week = 1; week <= 40; week++) {
      state.week = week;
      beginWeek(state);
      academyTasks(state);
    }
    assert.equal(Object.keys(state.tasks).filter((id) => /^academy-/.test(id)).length, 4);
    for (const task of Object.values(state.tasks)) {
      assert.equal(taskModule(task).game, undefined, task.id);
      assert.ok(
        !['urban_planning', 'tech_english', 'visual_communication', 'foreign_language'].includes(
          task.course,
        ),
      );
    }
    assert.ok(!state.pending.includes('club_signup'));
    assert.ok(!state.plan.some((s) => s.activity === 'club'));
  }
});

test('a new week assigns actual pending tasks, while completed targets are never repeated', () => {
  const state = createGame(profile);
  state.week = 2;
  beginWeek(state);
  assert.ok(state.plan.some((s) => s.activity === 'task' && s.target.startsWith('project-')));
  const completed = state.plan.find((s) => s.activity === 'task').target;
  state.tasks[completed].status = 'completed';
  state.week = 3;
  beginWeek(state);
  assert.ok(!state.plan.some((s) => s.activity === 'task' && s.target === completed));
  assert.ok(state.plan.some((s) => s.activity === 'sleep'));
  assert.throws(() => transition(state, { type: 'plan', index: 1, activity: 'club' }), {
    code: 'ACTIVITY_LOCKED',
  });
});

test('migration finishes the already paid old task slot once without changing money, GPA or past grades', () => {
  let old = createGame({ ...profile, priorGpa: 3.77 });
  old.tasks['practice-report'].module = { id: 'pattern_v2', params: {} };
  old.plan = Array.from({ length: 21 }, (_, i) => ({
    activity: i === 1 ? 'task' : 'sleep',
    target: i === 1 ? 'practice-report' : null,
  }));
  old = transition(old, { type: 'advance' });
  delete old.flags.plannerVersion;
  old.contentVersion = '2026.11.10-hannah-1';
  const before = structuredClone(old),
    next = migrateState(old);
  assert.ok(validateState(next));
  assert.equal(next.contentVersion, CONTENT_VERSION);
  assert.equal(next.tasks['practice-report'].progress, 1);
  assert.equal(next.weekRun.cursor, 2);
  assert.equal(next.weekRun.waiting, null);
  assert.equal(next.money, before.money);
  assert.equal(next.stats.hp, before.stats.hp);
  assert.equal(next.campaign.priorGpa, 3.77);
  assert.deepEqual(next.assessments, before.assessments);
  assert.deepEqual(migrateState(next), next);
  assert.deepEqual(old, before);
});

test('retired coursework does not penalize the school record during save migration', () => {
  const old = createGame(profile);
  old.week = 3;
  delete old.flags.plannerVersion;
  old.tasks['project-2-tech_english'] = {
    id: 'project-2-tech_english',
    name: '기존 과제',
    description: '',
    course: 'tech_english',
    target: 2,
    progress: 0,
    status: 'active',
    start: 2,
    deadline: 3,
    module: { id: 'order_v2', params: {} },
  };
  const next = migrateState(old);
  assert.ok(validateState(next));
  assert.equal(next.tasks['project-2-tech_english'].retired, true);
  assert.equal(schoolRecord(next).due, 0);
  assert.deepEqual(next.stats, old.stats);
  assert.deepEqual(next.assessments, old.assessments);
});
