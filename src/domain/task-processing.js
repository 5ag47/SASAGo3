import { STATS } from './catalog.js';
import { courseAbility } from './course-progress.js';
import { random, applyEffects } from './random.js';
import { taskModule, taskModuleSpec, validModuleData } from './task-modules/registry.js';
import { requireAction } from './task-modules/action-error.js';
import { supportedEssayQuality, supportedEssayCost } from './school-record.js';

export function taskContext(state, task) {
  const statsAfter = (effects) => {
    const copy = { stats: { ...state.stats } };
    applyEffects(copy, effects);
    return Object.freeze(copy.stats);
  };
  return {
    week: state.week,
    task: Object.freeze(structuredClone(task)),
    stats: Object.freeze({ ...state.stats }),
    params: Object.freeze(structuredClone(taskModuleSpec(task).params)),
    ability: task.course ? courseAbility(state, task.course) : 0,
    abilityAfter: (effects) =>
      task.course ? courseAbility({ ...state, stats: statsAfter(effects) }, task.course) : 0,
    statsAfter,
    support: (model, quality) =>
      model === 'essay' ? supportedEssayQuality(state, quality) : quality,
    supportCost: (model, effects) =>
      model === 'essay' ? supportedEssayCost(state, effects) : effects,
    roll: () => random(state),
  };
}
export function processTaskWork(state, task, amount) {
  const result = taskModule(task).work({ ...taskContext(state, task), amount });
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
  const result = taskModule(task).isComplete(taskContext(state, task));
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
    data = game.create(taskContext(state, task));
  } else {
    requireAction(
      task.moduleData && !task.moduleData.passed,
      '진행 중인 미니게임에서 선택해 주세요.',
    );
    const before = task.moduleData;
    data = game.act(taskContext(state, task), before, action);
    const effects = taskModule(task).actionEffects?.(taskContext(state, task), before, data);
    if (effects) applyTaskEffects(state, effects);
  }
  if (!game.valid(data) || !validModuleData(data))
    throw new Error(`TASK_GAME_STATE_INVALID:${task.id}`);
  task.moduleData = data;
}
export function applyTaskEffects(state, effects) {
  if (
    !effects ||
    typeof effects !== 'object' ||
    Array.isArray(effects) ||
    Object.entries(effects).some(
      ([id, value]) =>
        !Object.hasOwn(STATS, id) || !Number.isFinite(value) || Math.abs(value) > 100,
    )
  )
    throw new Error('TASK_MODULE_EFFECTS_INVALID');
  applyEffects(state, effects);
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
  const result = handler[completed ? 'complete' : 'expire'](taskContext(state, task));
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
