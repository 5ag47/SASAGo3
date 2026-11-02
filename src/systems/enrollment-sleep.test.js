import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, migrateSave, validSave } from '../game.js';
import { enrollCourse } from './enrollment.js';
import { advanceWeek, resolveWeek } from './week.js';

test('최초 확정 직후 같은 주에도 다른 과목으로 재신청할 수 없다', () => {
  const original = initialGame();
  const enrolled = enrollCourse(original, '정보과학');
  assert.equal(enrolled.major, '정보과학');
  assert.equal(enrolled.enrolled, true);
  assert.equal(enrolled.week, 0);
  assert.equal(original.enrolled, false);
  assert.equal(enrollCourse(enrolled, '물리'), enrolled);
  const restored = migrateSave(JSON.parse(JSON.stringify(enrolled)));
  assert.equal(enrollCourse(restored, '물리'), restored);
  assert.equal(enrollCourse(advanceWeek(enrolled), '물리').major, '정보과학');
});
test('존재하지 않는 과목과 종료 후 신청은 거부한다', () => {
  const game = initialGame();
  assert.equal(enrollCourse(game, '없는 과목'), game);
  const ended = { ...game, ended: true };
  assert.equal(enrollCourse(ended, '정보과학'), ended);
});
test('월요일부터 일요일까지 각 수면 선택을 독립적으로 저장한다', () => {
  const game = { ...initialGame(), sleepPlan: [6, 7, 8, 6, 8, 7, 6] };
  const restored = migrateSave(JSON.parse(JSON.stringify(game)));
  assert.ok(validSave(restored));
  assert.deepEqual(restored.sleepPlan, game.sleepPlan);
  const next = advanceWeek(restored);
  assert.deepEqual(next.history[0].sleepPlan, game.sleepPlan);
  assert.deepEqual(next.history[0].daily.map(day => day.sleepHours), game.sleepPlan);
  assert.deepEqual(next.sleepPlan, game.sleepPlan);
  assert.ok(validSave(next));
});
test('일요일 수면만 바꾸면 앞선 여섯 날의 결과는 바뀌지 않는다', () => {
  const game = { ...initialGame(), plan: Array(7).fill('game') };
  const short = { ...game, sleepPlan: [8, 8, 8, 8, 8, 8, 6] };
  const regular = resolveWeek(game), changed = resolveWeek(short);
  assert.deepEqual(changed.daily.slice(0, 6), regular.daily.slice(0, 6));
  assert.equal(changed.after.hp, regular.after.hp - 4);
  assert.equal(changed.after.focus, regular.after.focus - 2);
  assert.equal(changed.daily[6].sleepHours, 6);
});
test('수면이 다른 한 주도 일별 합계가 주간 증감과 일치하며 원본을 변경하지 않는다', () => {
  const game = { ...initialGame(), sleepPlan: [6, 7, 8, 6, 7, 8, 6] };
  const snapshot = structuredClone(game);
  const result = resolveWeek(game);
  for (const key of Object.keys(game.stats)) {
    assert.equal(result.daily.reduce((sum, day) => sum + (day.delta[key] || 0), 0), result.delta[key]);
  }
  assert.deepEqual(game, snapshot);
});
test('v4 저장 이전은 확정 과목·기록·금액을 유지하고 기본 수면만 추가한다', () => {
  const { sleepPlan, ...legacy } = advanceWeek(enrollCourse(initialGame(), '정보과학'));
  legacy.version = 4;
  const migrated = migrateSave(legacy);
  assert.ok(validSave(migrated));
  assert.equal(migrated.major, legacy.major);
  assert.equal(migrated.enrolled, true);
  assert.equal(migrated.money, legacy.money);
  assert.deepEqual(migrated.history, legacy.history);
  assert.deepEqual(migrated.sleepPlan, Array(7).fill(8));
});
test('수강 여부가 없던 진행 저장도 기존 과목을 고정한다', () => {
  const legacy = { ...initialGame(), version: 2, week: 3, major: '정보과학' };
  delete legacy.enrolled;
  const migrated = migrateSave(legacy);
  assert.ok(migrated.enrolled);
  assert.equal(enrollCourse(migrated, '물리'), migrated);
});
test('잘못된 수면 배열과 기록은 복구에서 거부한다', () => {
  const game = initialGame();
  for (const sleepPlan of [undefined, null, [8], Array(7).fill(5), Array(7).fill('8')]) {
    assert.equal(validSave({ ...game, sleepPlan }), false);
  }
  const next = advanceWeek(game);
  next.history[0].daily[0].sleepHours = 99;
  assert.equal(validSave(next), false);
});
