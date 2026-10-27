import { transition } from '../../src/domain/engine.js';
import { taskModule } from '../../src/domain/task-modules/registry.js';
export function solveTaskGame(source, taskId) {
  let state = source;
  const move = (action) => {
    state = transition(state, { type: 'task_game', task: taskId, action });
  };
  const task = state.tasks[taskId];
  if (!taskModule(task).game || task.moduleData?.passed || task.status !== 'active') return state;
  if (!task.moduleData) move({ type: 'start' });
  let data = state.tasks[taskId].moduleData;
  if (data.kind === 'order') {
    for (const card of [...data.cards].sort((a, b) => a - b).slice(data.index))
      move({ type: 'pick', card });
  } else {
    const goal = [...data.goal];
    if (data.phase === 'preview') move({ type: 'ready' });
    for (const cell of data.selected) move({ type: 'toggle', cell });
    for (const cell of goal) move({ type: 'toggle', cell });
    move({ type: 'check' });
  }
  return state;
}
export function solveActiveTaskGames(source) {
  let state = source;
  for (const task of Object.values(state.tasks))
    if (task.status === 'active') state = solveTaskGame(state, task.id);
  return state;
}
