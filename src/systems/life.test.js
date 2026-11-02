import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, validSave, migrateSave } from '../game.js';
import { advanceWeek, weeklyGoals, studyEfficiency } from './week.js';
import { buyItem, useItem } from './inventory.js';
import { authenticate, restoreSession, SESSION_KEY, accountSaveKey } from './accounts.js';
import { ITEMS } from '../data/items.js';
const storage = () => {
  const data = new Map();
  return {
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: k => data.delete(k)
  };
};
test('구매/사용: 금액과 재고가 정확히 바뀌고 초과 구매와 이중 소모를 막는다', () => {
  const original = initialGame(),
    item = ITEMS[0];
  const bought = buyItem(original, item.id);
  assert.equal(bought.money, original.money - item.price);
  assert.equal(bought.inventory[item.id], 1);
  assert.deepEqual(original.inventory, {});
  const used = useItem(bought, item.id);
  assert.equal(used.inventory[item.id], 0);
  assert.equal(used.stats.hp, original.stats.hp + item.effect.hp);
  assert.equal(useItem(used, item.id), used);
  const poor = {
    ...original,
    money: 0
  };
  assert.equal(buyItem(poor, item.id), poor);
  const full = {
    ...original,
    inventory: {
      [item.id]: 99
    }
  };
  assert.equal(buyItem(full, item.id), full);
  assert.equal(validSave(used), true);
});
test('아이템 효과는 능력치 상한·하한을 넘지 않는다', () => {
  const game = {
    ...initialGame(),
    stats: {
      ...initialGame().stats,
      hp: 99,
      stress: 1
    },
    inventory: {
      milk: 1
    }
  };
  const next = useItem(game, 'milk');
  assert.equal(next.stats.hp, 100);
  assert.equal(next.stats.stress, 0);
});
test('목표를 달성해도 재화 보상은 없고 주간 용돈만 정산된다', () => {
  assert.deepEqual(weeklyGoals(['math', 'math', 'rest', 'science', 'science', 'game']), [true, true]);
  assert.deepEqual(weeklyGoals(Array(6).fill('game')), [false, false]);
  const game = initialGame();
  const next = advanceWeek(game, 0);
  assert.equal(next.history[0].economy.reward, 0);
  assert.equal(next.money - game.money, next.history[0].economy.net);
});
test('규칙 위반 선택에만 벌금을 부과하고 사건 효과까지 기록에 반영한다', () => {
  const game = {
    ...initialGame(),
    week: 2
  };
  const safe = advanceWeek(game, 0),
    fined = advanceWeek(game, 1);
  assert.equal(safe.history[0].economy.fine, 0);
  assert.equal(fined.history[0].economy.fine, 1000);
  assert.ok(fined.stats.hp < safe.stats.hp);
  for (const key of Object.keys(game.stats)) assert.equal(fined.stats[key] - game.stats[key], fined.history[0].delta[key]);
  assert.equal(advanceWeek(game, 999), game);
});
test('평판 상승은 추가 용돈으로 이어지고 신체와 멘탈 모두 능률에 반영된다', () => {
  const low = initialGame(),
    high = {
      ...low,
      stats: {
        ...low.stats,
        reputation: 80
      }
    };
  assert.ok(advanceWeek(high).history[0].economy.bonus > advanceWeek(low).history[0].economy.bonus);
  assert.ok(studyEfficiency({
    hp: 90,
    focus: 50,
    stress: 20
  }).value > studyEfficiency({
    hp: 40,
    focus: 50,
    stress: 20
  }).value);
  assert.ok(studyEfficiency({
    hp: 60,
    focus: 90,
    stress: 20
  }).value > studyEfficiency({
    hp: 60,
    focus: 30,
    stress: 20
  }).value);
});
test('12주를 진행해 평가 3회와 엔딩에 도달하며 추가 진행으로 돈을 얻을 수 없다', () => {
  let game = {
    ...initialGame(),
    created: true,
    enrolled: true,
    major: '정보과학'
  };
  for (let week = 0; week < 12; week++) {
    game = advanceWeek(game, week % 2);
    assert.equal(validSave(game), true);
    assert.equal(game.history.at(-1).daily.length, 7);
    assert.equal(game.history.at(-1).major, '정보과학');
  }
  assert.equal(game.ended, true);
  assert.equal(game.week, 12);
  assert.equal(game.history.filter(entry => entry.assessment !== null).length, 3);
  assert.equal(advanceWeek(game), game);
});
test('이전 v2 저장은 진행과 금액을 보존하고 새 필드가 추가된다', () => {
  const {
    inventory,
    enrolled,
    major,
    tutorialStep,
    ended,
    noticeReadWeek,
    ...old
  } = initialGame();
  const next = migrateSave({
    ...old,
    version: 2,
    week: 5,
    money: 25000
  });
  assert.equal(next.week, 5);
  assert.equal(next.money, 25000);
  assert.deepEqual(next.inventory, {});
  assert.equal(validSave(next), true);
});
test('손상된 재고 및 새 결과 데이터는 저장 복원에서 거부한다', () => {
  const game = advanceWeek(initialGame());
  for (const inventory of [null, [], {
    milk: -1
  }, {
    unknown: 1
  }, {
    milk: 100
  }]) assert.equal(validSave({
    ...game,
    inventory
  }), false);
  const broken = {
    ...game,
    history: [{
      ...game.history[0],
      daily: [{}]
    }]
  };
  assert.equal(validSave(broken), false);
});
test('로컬 가입·로그인·세션 복원과 계정별 저장 키가 분리된다', async () => {
  const db = storage(),
    session = storage();
  const one = await authenticate('signup', 'student_a', 'test-password', db);
  const two = await authenticate('signup', 'student_b', 'test-password', db);
  assert.notEqual(accountSaveKey(one.id), accountSaveKey(two.id));
  assert.equal((await authenticate('login', 'STUDENT_A', 'test-password', db)).id, one.id);
  await assert.rejects(authenticate('login', 'student_a', 'wrong-password', db));
  await assert.rejects(authenticate('signup', 'student_a', 'test-password', db));
  session.setItem(SESSION_KEY, one.id);
  assert.deepEqual(restoreSession(db, session), one);
  session.removeItem(SESSION_KEY);
  assert.equal(restoreSession(db, session), null);
  const raw = db.getItem('sasago3-accounts-v1');
  assert.ok(!raw.includes('test-password'));
  db.setItem(accountSaveKey(one.id), JSON.stringify({
    ...initialGame(),
    money: 999
  }));
  assert.equal(db.getItem(accountSaveKey(two.id)), null);
});
test('계정 입력 형식과 비밀번호 길이를 검증한다', async () => {
  for (const name of ['a', 'bad space', '<script>']) await assert.rejects(authenticate('signup', name, 'test-password', storage()));
  await assert.rejects(authenticate('signup', 'student', '123', storage()));
});
