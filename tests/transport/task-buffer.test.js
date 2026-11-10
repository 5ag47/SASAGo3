import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition } from '../../src/domain/engine.js';
import { createTaskInputBuffer } from '../../src/platform/task-input-buffer.js';
function fixture() {
  let state = createGame(
    { name: '입력 검사', character: 'girl', role: 'steady', major: 'math' },
    1107,
  );
  const id = 'practice-report';
  state.tasks[id].module = { id: 'order_v2', params: {} };
  state.plan = Array.from({ length: 21 }, (_, i) =>
    i === 0 ? { activity: 'task', target: id } : { activity: 'sleep', target: null },
  );
  state = transition(state, { type: 'advance' });
  state = transition(state, { type: 'task_game', task: id, action: { type: 'start' } });
  const cells = [...state.tasks[id].moduleData.cards].sort((a, b) => a - b),
    values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const apply = (action) => {
    state = transition(state, { type: 'task_game', task: id, action });
    return state;
  };
  return {
    id,
    cells,
    storage,
    values,
    apply,
    get state() {
      return state;
    },
  };
}
test('input continues during an in-flight save and ordered batches preserve every selection', async () => {
  const f = fixture();
  let release;
  const gate = new Promise((resolve) => (release = resolve)),
    sent = [];
  const buffer = createTaskInputBuffer({
    task: f.state.tasks[f.id],
    storage: f.storage,
    storageKey: 'draft',
    send: async (action) => {
      sent.push(action);
      await gate;
      return f.apply(action);
    },
  });
  buffer.input({ type: 'pick', card: f.cells[0] });
  const first = buffer.flush();
  buffer.input({ type: 'pick', card: f.cells[1] });
  assert.equal(buffer.snapshot().data.index, 2);
  assert.equal(buffer.snapshot().blocked, false);
  release();
  await first;
  await buffer.flush();
  buffer.detach();
  assert.equal(f.state.tasks[f.id].moduleData.index, 2);
  assert.equal(f.state.tasks[f.id].attempts.sequence, 2);
  assert.equal(sent.length, 2);
  assert.equal(f.values.size, 0);
});
test('a lost reply is recovered from the saved sequence without double-applying toggles or costs', async () => {
  const f = fixture(),
    before = f.state.tasks[f.id].attempts.total;
  const buffer = createTaskInputBuffer({
    task: f.state.tasks[f.id],
    storage: f.storage,
    storageKey: 'draft',
    send: async (action) => {
      f.apply(action);
      return false;
    },
  });
  buffer.input({ type: 'pick', card: f.cells[0] });
  buffer.input({ type: 'pick', card: f.cells[1] });
  await buffer.flush();
  buffer.detach();
  assert.equal(f.values.size, 1);
  const restored = createTaskInputBuffer({
    task: f.state.tasks[f.id],
    storage: f.storage,
    storageKey: 'draft',
    send: async (action) => f.apply(action),
  });
  assert.equal(restored.snapshot().data.index, 2);
  assert.equal(restored.snapshot().queued, 0);
  assert.equal(f.values.size, 0);
  assert.equal(f.state.tasks[f.id].attempts.total, before);
  restored.detach();
});
test('unconfirmed input survives reopening and conflicts require an explicit server-state choice', async () => {
  const f = fixture();
  const buffer = createTaskInputBuffer({
    task: f.state.tasks[f.id],
    storage: f.storage,
    storageKey: 'draft',
    send: async () => false,
  });
  buffer.input({ type: 'pick', card: f.cells[0] });
  await buffer.flush();
  buffer.detach();
  const restored = createTaskInputBuffer({
    task: f.state.tasks[f.id],
    storage: f.storage,
    storageKey: 'draft',
    send: async (action) => f.apply(action),
  });
  assert.equal(restored.snapshot().data.index, 1);
  await restored.flush();
  restored.detach();
  assert.equal(f.state.tasks[f.id].moduleData.index, 1);
  const conflictDraft = {
    attempt: f.state.tasks[f.id].attempts.total,
    from: 0,
    actions: [{ type: 'pick', card: f.cells[3] }],
  };
  f.storage.setItem('other', JSON.stringify(conflictDraft));
  const conflict = createTaskInputBuffer({
    task: f.state.tasks[f.id],
    storage: f.storage,
    storageKey: 'other',
    send: async (action) => f.apply(action),
  });
  assert.equal(conflict.snapshot().blocked, true);
  assert.ok(f.values.has('other'));
  conflict.acceptServer(f.state.tasks[f.id]);
  assert.equal(conflict.snapshot().blocked, false);
  assert.equal(conflict.snapshot().data.index, 1);
  assert.ok(!f.values.has('other'));
  conflict.detach();
});
