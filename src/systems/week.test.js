import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, validSave } from '../game.js';
import { STATS } from '../data/stats.js';
import { advanceWeek, resolveWeek, studyEfficiency } from './week.js';

const withPlan = (plan, stats = {}) => {
  const game = initialGame();
  game.created = true;
  game.plan = plan;
  game.stats = { ...game.stats, ...stats };
  return game;
};
const all = id => Array(6).fill(id);

test('휴식만 하면 건강이 오르고 스트레스가 내린다', () => {
  const { delta } = resolveWeek(withPlan(all('rest')));
  assert.ok(delta.hp > 0);
  assert.ok(delta.stress < 0);
  assert.equal(delta.math, 0);
});

test('공부하면 해당 능력치가 오르고 건강·집중력이 줄어든다', () => {
  const { delta } = resolveWeek(withPlan(['math', 'math', 'rest', 'rest', 'rest', 'rest']));
  assert.ok(delta.math > 0);
  assert.equal(delta.science, 0);
});

test('같은 공부를 반복할수록 증가량이 줄고 안내 문구가 붙는다', () => {
  const twice = resolveWeek(withPlan(['math', 'math', 'rest', 'rest', 'rest', 'rest']));
  const six = resolveWeek(withPlan(all('math')));
  assert.ok(six.delta.math / 6 < twice.delta.math / 2);
  assert.ok(six.notes.some(note => note.includes('반복')));
  assert.ok(!twice.notes.some(note => note.includes('반복')));
});

test('스트레스가 높으면 같은 공부라도 덜 오른다', () => {
  const plan = ['math', 'math', 'rest', 'rest', 'rest', 'rest'];
  const calm = resolveWeek(withPlan(plan, { stress: 30 }));
  const stressed = resolveWeek(withPlan(plan, { stress: 80 }));
  assert.ok(stressed.delta.math < calm.delta.math);
  assert.ok(stressed.notes.some(note => note.includes('스트레스')));
});

test('건강이 낮으면 학습 효율이 떨어진다', () => {
  assert.ok(studyEfficiency({ focus: 50, stress: 30, hp: 20 }).value < studyEfficiency({ focus: 50, stress: 30, hp: 60 }).value);
});

test('능력치는 항상 0~100 범위를 지킨다', () => {
  for (const [id, stats] of [['rest', { hp: 98, focus: 99, stress: 2 }], ['game', { stress: 3, hp: 1, focus: 1 }], ['math', { math: 99, hp: 1, stress: 99 }]]) {
    const { after } = resolveWeek(withPlan(all(id), stats));
    for (const { key } of STATS) assert.ok(after[key] >= 0 && after[key] <= 100, `${id}/${key}`);
  }
});

test('한 주를 진행하면 주차가 넘어가고 기록이 쌓이며 저장 형식을 유지한다', () => {
  const game = withPlan(['math', 'math', 'science', 'game', 'interview', 'write']);
  game.tasks = [true, true];
  const next = advanceWeek(game);
  assert.equal(next.week, 1);
  assert.deepEqual(next.tasks, [false, false]);
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0].week, 0);
  assert.deepEqual(next.plan, game.plan);
  assert.equal(validSave(next), true);
  assert.equal(game.week, 0);
});

test('기록의 변화량은 이전·이후 능력치의 차이와 일치한다', () => {
  const game = withPlan(['math', 'rest', 'science', 'game', 'interview', 'write']);
  const next = advanceWeek(game);
  for (const { key } of STATS) assert.equal(next.stats[key] - game.stats[key], next.history[0].delta[key]);
});
