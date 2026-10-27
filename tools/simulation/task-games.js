import { transition } from '../../src/domain/engine.js';
import { taskModule } from '../../src/domain/task-modules/registry.js';
export function solveTaskGame(source, taskId) {
  let state = source;
  const move = (action) => {
    state = transition(state, { type: 'task_game', task: taskId, action });
  };
  const task = state.tasks[taskId];
  if (state.weekRun?.waiting?.kind !== 'task' || state.weekRun.waiting.task !== taskId)
    return state;
  if (!taskModule(task).game || task.moduleData?.passed || task.status !== 'active') return state;
  if (!task.moduleData) move({ type: 'start' });
  const current = state.tasks[taskId],
    data = current.moduleData,
    actions = [];
  if (data.kind === 'order')
    for (const card of [...data.cards].sort((a, b) => a - b).slice(data.index))
      actions.push({ type: 'pick', card });
  else {
    const goal = [...data.goal];
    if (data.phase === 'preview') actions.push({ type: 'ready' });
    for (const cell of data.selected) actions.push({ type: 'toggle', cell });
    for (const cell of goal) actions.push({ type: 'toggle', cell });
    actions.push({ type: 'check' });
  }
  move({
    type: 'batch',
    attempt: current.attempts.total,
    from: current.attempts.sequence,
    actions,
  });
  return state;
}
export function solveActiveTaskGames(source) {
  return source.weekRun?.waiting?.kind === 'task'
    ? solveTaskGame(source, source.weekRun.waiting.task)
    : source;
}
export function runPlannedWeek(source) {
  let state = source;
  const week = state.week;
  let steps = 0;
  do {
    if (++steps > 1000) throw new Error('SIMULATION_WEEK_LOOP');
    state =
      state.weekRun?.waiting?.kind === 'task'
        ? solveTaskGame(state, state.weekRun.waiting.task)
        : transition(state, { type: 'advance' });
  } while (state.week === week);
  return state;
}
