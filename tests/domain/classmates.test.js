import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { validateState } from '../../src/domain/state.js';
import { courses, MAJORS, STATS } from '../../src/domain/catalog.js';
import {
  applicationBoard,
  classmateData,
  classmateIssues,
  classmateResults,
  deliverClassmateNews,
} from '../../src/domain/classmates.js';
import { solveActiveTaskGames } from '../helpers/task-games.js';

const context = { courses, stats: STATS, majors: MAJORS };
function fresh(seed = 3) {
  const state = solveActiveTaskGames(
    transition(
      createGame({ name: '친구', character: 'boy', role: 'steady', major: 'math' }, seed),
      {
        type: 'choose',
        event: 'winter_study',
        option: 'friends',
      },
    ),
  );
  state.pending = [];
  return state;
}
const allRumors = () => Object.values(classmateData.classmates).flatMap((mate) => mate.rumors);

test('the shipped classmates file is valid', () => {
  assert.deepEqual(classmateIssues(undefined, context), []);
  assert.ok(Object.keys(classmateData.classmates).length >= 5);
});

test('editing mistakes are reported with the exact field to fix', () => {
  const broken = structuredClone(classmateData);
  const first = Object.keys(broken.classmates)[0];
  broken.classmates[first].major = 'music';
  broken.classmates[first].routes = ['harvard'];
  broken.classmates[first].rumors.push({ ...broken.classmates[first].rumors[0] });
  broken.classmates[first].rumors.push({
    id: 'too-strong',
    week: 3,
    text: '너무 센 효과',
    effect: { stress: 50 },
    when: { stat: 'luck', min: 1 },
  });
  const issues = classmateIssues(broken, context).join('\n');
  assert.match(issues, new RegExp(`classmates\\.${first}\\.major`));
  assert.match(issues, new RegExp(`classmates\\.${first}\\.routes`));
  assert.match(issues, /다른 소문과 겹침/);
  assert.match(issues, /effect: 능력치 ID와 -10~10/);
  assert.match(issues, /when/);
});

test('a rumor is checked once on its week, applies its effect, and draws no random numbers', () => {
  const rumor = allRumors().find((item) => item.effect && !item.when);
  const state = fresh();
  state.week = rumor.week;
  const stress = state.stats.stress,
    seed = state.seed;
  deliverClassmateNews(state);
  assert.equal(state.seed, seed, 'no random draw');
  assert.equal(state.flags.rumors[rumor.id], true);
  assert.ok(state.notices.some((n) => n.kind === 'rumor' && n.text === rumor.text));
  assert.notEqual(state.stats.stress, stress);
  const count = state.notices.length;
  deliverClassmateNews(state);
  assert.equal(state.notices.length, count, 'never twice');
  assert.ok(validateState(state));
});

test('a rumor whose condition fails on its week does not appear later', () => {
  const rumor = allRumors().find((item) => item.when?.task === 'essay');
  const state = fresh();
  state.week = rumor.week;
  deliverClassmateNews(state);
  assert.equal(state.flags.rumors[rumor.id], true);
  assert.ok(!state.notices.some((n) => n.text === rumor.text), 'no essay task, no rumor');
  state.tasks.essay = { status: 'active' };
  deliverClassmateNews(state);
  assert.ok(!state.notices.some((n) => n.text === rumor.text));
});

test('the application board opens in application season and counts the player where they apply', () => {
  const state = fresh();
  state.week = classmateData.school.boardWeek - 1;
  assert.equal(applicationBoard(state), null);
  state.week = classmateData.school.boardWeek;
  state.flags.target = 'dream';
  state.flags.csat = 'skip';
  const board = Object.fromEntries(applicationBoard(state).map((row) => [row.id, row]));
  assert.equal(board.top_interview.you, true);
  assert.equal(board.korea_university.you, false);
  assert.equal(board.regular.you, false);
  const named = Object.values(classmateData.classmates).filter((m) =>
    m.routes.includes('top_interview'),
  ).length;
  assert.equal(
    board.top_interview.total,
    classmateData.school.otherApplicants.top_interview + named + 1,
  );
  state.flags.csat = 'prepare';
  assert.equal(applicationBoard(state).find((row) => row.id === 'regular').you, true);
});

test('friends results are revealed once on the result week', () => {
  const state = fresh();
  state.week = classmateData.school.resultWeek - 1;
  assert.equal(classmateResults(state), null);
  state.week = classmateData.school.resultWeek;
  deliverClassmateNews(state);
  deliverClassmateNews(state);
  assert.equal(state.notices.filter((n) => n.title === '동기들의 결과').length, 1);
  assert.equal(classmateResults(state).length, Object.keys(classmateData.classmates).length);
});

test('saves from before classmates existed stay valid', () => {
  const state = fresh();
  delete state.flags.rumors;
  assert.ok(validateState(state));
  state.flags.rumors = { a: 'yes' };
  assert.equal(validateState(state), false);
});
