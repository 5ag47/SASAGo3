import { transition } from '../../src/domain/engine.js';
import { taskModule } from '../../src/domain/task-modules/registry.js';
function subsetFor(cards, target) {
  for (let mask = 1; mask < 1 << cards.length; mask++) {
    const pick = cards.filter((_, index) => mask & (1 << index));
    if (pick.length >= 2 && pick.reduce((sum, card) => sum + card, 0) === target) return pick;
  }
  throw new Error('SIMULATION_SUM_UNSOLVABLE');
}
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
  else if (data.kind === 'subject_quiz')
    for (let i = data.index; i < 3; i++)
      actions.push({ type: 'answer', answer: data.questions[i].correct });
  else if (data.kind === 'report')
    for (let index = data.placed; index < 5; index++)
      actions.push({ type: 'pick', card: `s${index}` });
  // The policy sees the server-side state, so it plays as a student who already knows the answer.
  else if (data.kind === 'experiment') actions.push({ type: 'answer', variable: data.cause });
  else if (data.kind === 'sum') {
    for (const card of data.selected) actions.push({ type: 'toggle', card });
    for (const card of subsetFor(data.cards, data.target)) actions.push({ type: 'toggle', card });
    actions.push({ type: 'check' });
  } else {
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
    if (state.campaign.quiz && state.pending.includes(`story_quiz_crisis_${week}`))
      state = transition(state, {
        type: 'choose',
        event: `story_quiz_crisis_${week}`,
        option: 'honest',
      });
    state =
      state.weekRun?.waiting?.kind === 'task'
        ? solveTaskGame(state, state.weekRun.waiting.task)
        : transition(state, { type: 'advance' });
  } while (state.week === week);
  return state;
}
