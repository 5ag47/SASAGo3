import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, migrateSave, validSave } from '../game.js';
import { resolveWeek, advanceWeek } from './week.js';
import { isNightAt } from './clock.js';
test('일요일에 신청한 학습이 반영되고 자동 휴식이 중복 적용되지 않는다', () => {
  const game = initialGame();
  game.plan = ['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'science'];
  const result = resolveWeek(game);
  assert.equal(result.daily.length, 7);
  assert.equal(result.daily.at(-1).day, '일');
  assert.equal(result.daily.at(-1).label, '물리');
  assert.ok(result.delta.science > 0);
  const active = {
    ...initialGame(),
    plan: Array(7).fill('game')
  };
  const after = resolveWeek(active);
  assert.equal(after.after.hp, active.stats.hp - 7);
  assert.equal(after.after.focus, active.stats.focus - 14);
});
test('일요일 변경은 저장·복원 뒤에도 유지된다', () => {
  const game = initialGame();
  game.plan[6] = 'math';
  const loaded = migrateSave(JSON.parse(JSON.stringify(game)));
  assert.equal(validSave(loaded), true);
  assert.equal(loaded.plan[6], 'math');
});
test('6일짜리 기존 저장은 일요일만 추가하고 과거 기록과 잔액을 보존한다', () => {
  const old = {
    ...initialGame(),
    version: 3,
    week: 1,
    money: 12345,
    plan: initialGame().plan.slice(0, 6)
  };
  const record = advanceWeek(initialGame()).history[0];
  old.history = [{
    ...record,
    plan: record.plan.slice(0, 6)
  }];
  const snapshot = structuredClone(old);
  const next = migrateSave(old);
  assert.equal(next.version, 4);
  assert.equal(next.plan.length, 7);
  assert.equal(next.plan[6], 'rest');
  assert.deepEqual(next.plan.slice(0, 6), old.plan);
  assert.deepEqual(next.history, old.history);
  assert.equal(next.money, 12345);
  assert.equal(validSave(next), true);
  assert.deepEqual(old, snapshot);
});
test('할 일 충족은 직접 보상이나 평판 추가 보상을 만들지 않는다', () => {
  const game = initialGame();
  const completed = advanceWeek(game, 0);
  const incomplete = advanceWeek({
    ...game,
    plan: Array(7).fill('game')
  }, 0);
  assert.equal(completed.history[0].economy.reward, 0);
  assert.equal(completed.stats.reputation, incomplete.stats.reputation);
  assert.equal(completed.money, incomplete.money);
});
test('일별 증감의 합이 실제 주간 활동 변화와 일치한다', () => {
  const game = {
    ...initialGame(),
    plan: ['math', 'math', 'math', 'science', 'exercise', 'rest', 'science']
  };
  const result = resolveWeek(game);
  for (const key of Object.keys(game.stats)) {
    const sum = result.daily.reduce((total, day) => total + (day.delta[key] || 0), 0);
    assert.equal(sum, result.delta[key], key);
  }
});
test('새 결과는 이전/현재 수치만 기록하고 일기를 생성하지 않는다', () => {
  const game = initialGame(),
    next = advanceWeek(game);
  const entry = next.history[0];
  assert.deepEqual(entry.before, game.stats);
  assert.deepEqual(entry.after, next.stats);
  assert.equal(entry.story, undefined);
});
test('브라우저 현지 시각 06:00·18:00 경계에서 배경이 전환된다', () => {
  for (const [hour, minute, night] of [[0, 0, true], [5, 59, true], [6, 0, false], [12, 0, false], [17, 59, false], [18, 0, true], [23, 59, true]]) {
    assert.equal(isNightAt(new Date(2026, 9, 27, hour, minute)), night);
  }
});
