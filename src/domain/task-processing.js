import { STATS } from './catalog.js';
import { courseAbility } from './course-progress.js';
import { random, applyEffects } from './random.js';
import { taskModule, taskModuleSpec, validModuleData } from './task-modules/registry.js';
import { requireAction } from './task-modules/action-error.js';

function context(state, task) {
  const statsAfter = (effects) => {
    const copy = { stats: { ...state.stats } };
    applyEffects(copy, effects);
    return Object.freeze(copy.stats);
  };
  return {
    task: Object.freeze(structuredClone(task)),
    stats: Object.freeze({ ...state.stats }),
    params: Object.freeze(structuredClone(taskModuleSpec(task).params)),
    ability: task.course ? courseAbility(state, task.course) : 0,
    abilityAfter: (effects) =>
      task.course ? courseAbility({ ...state, stats: statsAfter(effects) }, task.course) : 0,
    statsAfter,
    roll: () => random(state),
  };
}
export function processTaskWork(state, task, amount) {
  const result = taskModule(task).work({ ...context(state, task), amount });
  if (
    !result ||
    !Number.isFinite(result.progress) ||
    result.progress < 0 ||
    result.progress > 100 ||
    !validModuleData(result.data)
  )
    throw new Error(`TASK_MODULE_WORK_INVALID:${task.id}`);
  if (result.data !== undefined) task.moduleData = structuredClone(result.data);
  return result.progress;
}
export function taskIsComplete(state, task) {
  const result = taskModule(task).isComplete(context(state, task));
  if (typeof result !== 'boolean') throw new Error(`TASK_MODULE_COMPLETION_INVALID:${task.id}`);
  return result;
}
export function taskGameAction(state, task, action) {
  const game = taskModule(task).game;
  requireAction(game && action && typeof action === 'object' && !Array.isArray(action));
  let data;
  if (action.type === 'start') {
    requireAction(
      !task.moduleData && Object.keys(action).length === 1,
      '이미 시작한 미니게임입니다.',
    );
    data = game.create(context(state, task));
  } else {
    requireAction(
      task.moduleData && !task.moduleData.passed,
      '진행 중인 미니게임에서 선택해 주세요.',
    );
    data = game.act(context(state, task), task.moduleData, action);
  }
  if (!game.valid(data) || !validModuleData(data))
    throw new Error(`TASK_GAME_STATE_INVALID:${task.id}`);
  task.moduleData = data;
}
export function publicTasks(tasks) {
  return Object.fromEntries(
    Object.entries(tasks).map(([id, task]) => {
      const game = taskModule(task).game;
      return [
        id,
        game && task.moduleData ? { ...task, moduleData: game.public(task.moduleData) } : task,
      ];
    }),
  );
}
export function resolveTaskOutcome(state, task, completed) {
  const handler = taskModule(task);
  const result = handler[completed ? 'complete' : 'expire'](context(state, task));
  if (
    !result ||
    (result.score !== null &&
      (!Number.isFinite(result.score) || result.score < 0 || result.score > 100)) ||
    !result.effects ||
    Array.isArray(result.effects) ||
    typeof result.effects !== 'object' ||
    Object.entries(result.effects).some(
      ([key, value]) =>
        !Object.hasOwn(STATS, key) || !Number.isFinite(value) || Math.abs(value) > 100,
    ) ||
    (result.note !== undefined && (typeof result.note !== 'string' || result.note.length > 300)) ||
    (result.awards !== undefined &&
      (!Number.isInteger(result.awards) || result.awards < 0 || result.awards > 10))
  )
    throw new Error(`TASK_MODULE_OUTCOME_INVALID:${task.id}`);
  return result;
}
