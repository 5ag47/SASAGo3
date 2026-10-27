import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { D1Store } from '../../server/d1-store.js';
import { baseState } from '../../src/domain/state.js';

// Execute the adapter's real SQL in SQLite. This does not emulate Cloudflare's network/runtime.
function sqliteD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../server/schema.sql', import.meta.url), 'utf8'));
  function prepare(sql, values = []) {
    const execute = () => ({ meta: { changes: Number(db.prepare(sql).run(...values).changes) } });
    return {
      bind: (...args) => prepare(sql, args),
      first: async () => db.prepare(sql).get(...values) ?? null,
      run: async () => execute(),
      execute,
    };
  }
  return {
    prepare,
    close: () => db.close(),
    batch: async (statements) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = statements.map((statement) => statement.execute());
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
test('D1 SQL stores separate players and a stale commit creates no receipt', async (t) => {
  const db = sqliteD1();
  t.after(() => db.close());
  const store = new D1Store(db);
  const original = baseState();
  await store.create('a', original);
  await store.create('b', original);
  const next = { ...original, revision: 1, money: 12345 };
  assert.equal(await store.commit('a', 0, next, 'first', 'hash-a'), true);
  assert.equal(await store.commit('a', 0, { ...next, money: 10 }, 'stale', 'hash-b'), false);
  assert.equal((await store.get('a')).money, 12345);
  assert.equal((await store.get('b')).money, 30000);
  assert.equal(await store.receipt('a', 'stale'), null);
});
test('D1 SQL safely accepts only one duplicate concurrent commit and keeps its receipt', async (t) => {
  const db = sqliteD1();
  t.after(() => db.close());
  const store = new D1Store(db);
  const original = baseState();
  await store.create('a', original);
  const next = { ...original, revision: 1 };
  const result = await Promise.all([
    store.commit('a', 0, next, 'same', 'hash'),
    store.commit('a', 0, next, 'same', 'hash'),
  ]);
  assert.deepEqual(result.sort(), [false, true]);
  assert.equal((await store.receipt('a', 'same')).hash, 'hash');
  assert.equal((await store.get('a')).revision, 1);
});
test('D1 SQL rate limits reset only in the next time window', async (t) => {
  const db = sqliteD1();
  t.after(() => db.close());
  const store = new D1Store(db);
  assert.equal(await store.takeRate('a', 1, 2), true);
  assert.equal(await store.takeRate('a', 1, 2), true);
  assert.equal(await store.takeRate('a', 1, 2), false);
  assert.equal(await store.takeRate('a', 2, 2), true);
});
