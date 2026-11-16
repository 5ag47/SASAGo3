import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createGame, transition } from '../src/domain/engine.js';
import { simulateYear } from './simulation/run.js';
import { publicTasks } from '../src/domain/task-processing.js';
import { taskDelta } from '../server/game-updates.js';
function measure(source) {
  const task = Object.values(source.tasks).find(
    (task) => task.status === 'active' && task.special !== 'tutorial',
  );
  source.plan = Array.from({ length: 21 }, (_, index) =>
    index === 0 ? { activity: 'task', target: task.id } : { activity: 'sleep', target: null },
  );
  source = transition(source, { type: 'advance' });
  source = transition(source, { type: 'task_game', task: task.id, action: { type: 'start' } });
  let data = source.tasks[task.id].moduleData;
  if (data.kind === 'pattern') {
    source = transition(source, { type: 'task_game', task: task.id, action: { type: 'ready' } });
    data = source.tasks[task.id].moduleData;
  }
  const action =
    data.kind === 'pattern'
      ? { type: 'toggle', cell: data.goal[0] }
      : { type: 'pick', card: Math.min(...data.cards) };
  const command = { type: 'task_game', task: task.id, action };
  const timings = [];
  let next;
  for (let n = 0; n < 120; n++) {
    const before = performance.now();
    next = transition(source, command);
    JSON.stringify(next);
    timings.push(performance.now() - before);
  }
  timings.sort((a, b) => a - b);
  const publicState = {
    ...next,
    tasks: publicTasks(next.tasks),
    seed: 0,
    history: next.history.map(({ seedBefore, seedAfter, ...entry }) => entry),
  };
  return {
    historyWeeks: source.history.length,
    p50Ms: timings[60],
    p95Ms: timings[114],
    fullResponseBytes: Buffer.byteLength(JSON.stringify(publicState)),
    deltaResponseBytes: Buffer.byteLength(JSON.stringify(taskDelta(source, next, task.id))),
    taskBytes: Buffer.byteLength(JSON.stringify(publicTasks({ [task.id]: next.tasks[task.id] }))),
  };
}
let late;
simulateYear({
  onWeek(state) {
    if (state.week === 40) late = structuredClone(state);
  },
});
const result = {
  initial: measure(
    createGame({ name: '성능 검사', character: 'girl', role: 'steady', major: 'math' }),
  ),
  late: measure(late),
  assumptions:
    'Synthetic local Node.js CPU + serialization. Does not measure user browser, Google authentication, D1 network or production latency.',
};
mkdirSync('.local', { recursive: true });
writeFileSync('.local/input-performance.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
