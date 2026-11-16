import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { addTask } from '../../src/domain/tasks.js';
import {
  schoolRecord,
  supportedEssayCost,
  supportedEssayQuality,
  essayWorkAmount,
} from '../../src/domain/school-record.js';
import { refreshDocuments } from '../../src/domain/admission-documents.js';
import { admissionProjection } from '../../src/domain/admissions.js';
import {
  recommendationBurden,
  startRecommendation,
  advanceRecommendation,
} from '../../src/domain/recommendation.js';
import { migrateState, validateState } from '../../src/domain/state.js';
import { SAVE_MIGRATIONS } from '../../src/domain/state/migrate.js';
import { events } from '../../src/domain/catalog.js';
import { runPlannedWeek } from '../helpers/task-games.js';
const fresh = () =>
  createGame({ name: '누적 기록 검사', character: 'girl', role: 'steady', major: 'math' });
function done(state, id, quality = 90, extra = {}) {
  addTask(state, id, { name: id, target: 1, deadline: state.week, ...extra });
  Object.assign(state.tasks[id], {
    status: 'completed',
    progress: 1,
    result: { module: state.tasks[id].module.id, score: null, note: '', quality },
  });
}
function evidence(state, quality = 90) {
  for (let index = 0; index < 6; index++)
    done(state, 'record-' + index, quality, { course: 'linear_algebra', format: 'report' });
}
test('school records accumulate course work and participation while a thesis remains one limited contribution', () => {
  const state = fresh();
  state.week = 16;
  const before = schoolRecord(state).score;
  done(state, 'thesis', 100, { special: 'research' });
  assert.ok(schoolRecord(state).score - before <= 5);
  evidence(state);
  const work = schoolRecord(state);
  state.history.push({ week: 2, actions: [{ activity: 'club', index: 0 }] });
  assert.ok(schoolRecord(state).score > work.score);
  assert.equal(schoolRecord(state).completed, 6);
  assert.equal(schoolRecord(state).entries.length, 6);
  const legacy = fresh();
  legacy.week = 16;
  for (let index = 0; index < 12; index++)
    done(legacy, 'legacy-' + index, 100, { course: 'linear_algebra' });
  assert.equal(schoolRecord(legacy).scores.exploration, 100);
  assert.equal(schoolRecord(legacy).explorationCount, 12);
});
test('nearby records and relationships produce nearby effort costs without a hidden threshold jump', () => {
  const a = fresh();
  a.week = 16;
  evidence(a, 80);
  a.teachers = { math: 50, science: 50, homeroom: 50 };
  const b = structuredClone(a);
  for (const task of Object.values(b.tasks).filter((task) => task.course)) task.result.quality = 81;
  b.teachers = { math: 51, science: 51, homeroom: 51 };
  const costs = { hp: -0.5, focus: -0.25, stress: 1 };
  const first = supportedEssayCost(a, costs),
    second = supportedEssayCost(b, costs);
  for (const id of Object.keys(costs)) assert.ok(Math.abs(first[id] - second[id]) < 0.04);
  assert.ok(Math.abs(essayWorkAmount(a) - essayWorkAmount(b)) < 0.003);
  assert.ok(Math.abs(recommendationBurden(a, 'math') - recommendationBurden(b, 'math')) < 0.02);
  assert.ok(supportedEssayQuality(b, 90) >= supportedEssayQuality(a, 90));
  const weak = fresh();
  weak.teachers = { math: 10, science: 10, homeroom: 10 };
  assert.ok(supportedEssayCost(weak, costs).hp < first.hp - 0.4);
  const prepared = structuredClone(a);
  evidence(prepared, 100);
  prepared.teachers.math = 90;
  for (const state of [weak, prepared]) {
    startRecommendation(state, 'math');
    advanceRecommendation(state, 'math');
  }
  assert.ok(prepared.stats.hp > weak.stats.hp + 1);
  assert.ok(prepared.stats.stress < weak.stats.stress - 1);
});
test('recommendation preparation uses the actual teacher schedule and arrives on the next game day', () => {
  let state = fresh();
  state.week = events.recommendation.week;
  state.pending = ['recommendation'];
  state = transition(state, { type: 'choose', event: 'recommendation', option: 'math' });
  assert.equal(state.recommendation.status, 'preparing');
  state.plan = Array.from({ length: 21 }, (_, index) =>
    index < 2 ? { activity: 'teacher', target: 'math' } : { activity: 'sleep', target: null },
  );
  state = runPlannedWeek(state);
  assert.equal(state.recommendation.status, 'ready');
  assert.equal(state.recommendation.progress, 2);
  assert.ok(
    state.history.at(-1).actions.filter((action) => action.note.includes('자료 확인')).length === 2,
  );
  assert.ok(state.notices.some((notice) => notice.title === '추천서 준비 완료'));
  assert.ok(validateState(migrateState(JSON.parse(JSON.stringify(state)))));
});
test('the authored essay applies the same gradual support model during real scheduled attempts', () => {
  let state = fresh();
  state.week = 25;
  addTask(state, 'essay', events.essay);
  assert.equal(state.tasks.essay.module.params.support, 'essay');
  state.plan = Array.from({ length: 21 }, (_, index) =>
    index === 0 ? { activity: 'task', target: 'essay' } : { activity: 'sleep', target: null },
  );
  state = runPlannedWeek(state);
  const task = state.tasks.essay;
  assert.equal(task.attempts.successful, 1);
  assert.ok(task.attempts.lastQuality > 0 && task.attempts.lastQuality < 100);
  assert.ok(task.progress > 1 && task.progress < 2);
});
test('submitted records stay fixed while subsequent interview preparation can still change its own factor', () => {
  const state = fresh();
  state.week = 27;
  evidence(state);
  state.choices.applications = 'balanced';
  done(state, 'essay', 85, { special: 'essay' });
  done(state, 'application_form', 90, { special: 'application' });
  refreshDocuments(state);
  assert.ok(state.documents);
  const documents = structuredClone(state.documents),
    before = admissionProjection(state, 'korea_university');
  state.tasks['record-0'].result.quality = 0;
  state.stats.writing = 100;
  state.teachers.math = 100;
  state.interviewScore = 100;
  const after = admissionProjection(state, 'korea_university');
  assert.deepEqual(state.documents, documents);
  for (const id of ['gpa', 'record', 'essay', 'recommendation'])
    assert.equal(
      before.contributions.find((part) => part.id === id).value,
      after.contributions.find((part) => part.id === id).value,
    );
  assert.ok(after.score > before.score);
});
test('directions converge on shared submission rules and changing direction preserves accumulated work', () => {
  let state = fresh();
  state.week = 25;
  state.pending = [];
  state.flags.target = 'dream';
  state.choices.applications = 'dream';
  evidence(state);
  const tasks = structuredClone(state.tasks),
    stats = { ...state.stats };
  state = transition(state, { type: 'admission_direction', direction: 'balanced' });
  assert.deepEqual(state.tasks, tasks);
  assert.equal(state.stats.stress, stats.stress + 2);
  assert.equal(admissionProjection(state, 'top_interview').applied, false);
  done(state, 'essay', 85, { special: 'essay' });
  done(state, 'application_form', 90, { special: 'application' });
  refreshDocuments(state);
  assert.throws(() => transition(state, { type: 'admission_direction', direction: 'safe' }), {
    code: 'APPLICATIONS_CLOSED',
  });
});
test('named save migrations are unique, preserve old finished results and apply only once', () => {
  const old = fresh();
  old.week = 27;
  evidence(old);
  old.flags.recommender = 'math';
  delete old.documents;
  delete old.recommendation;
  delete old.flags.schoolRecordVersion;
  const original = structuredClone(old),
    next = migrateState(old);
  assert.equal(new Set(SAVE_MIGRATIONS.map((step) => step.id)).size, SAVE_MIGRATIONS.length);
  assert.equal(next.recommendation.status, 'ready');
  assert.deepEqual(next.tasks, original.tasks);
  assert.deepEqual(migrateState(next), next);
  assert.deepEqual(old, original);
  assert.ok(validateState(next));
});
test('strong auxiliary preparation cannot replace weak grades and school records', () => {
  const state = fresh();
  state.week = 28;
  state.interviewScore = 100;
  state.documents = {
    week: 28,
    direction: 'dream',
    factors: { gpa: 0, record: 0, fit: 100, essay: 100, recommendation: 100 },
    recordScores: { coursework: 0, exploration: 0, participation: 0, continuity: 0 },
  };
  assert.ok(admissionProjection(state, 'top_interview').score <= 30);
  assert.ok(admissionProjection(state, 'kaist_postech').score <= 35);
});
