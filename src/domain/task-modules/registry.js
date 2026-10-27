import time from './time-v1.js';
import contest from './contest-v1.js';
import order from './order-v1.js';
import pattern from './pattern-v1.js';

// Only reviewed repository modules can execute. JSON selects an ID and parameters.
const modules = [time, contest, order, pattern];
if (new Set(modules.map((module) => module.id)).size !== modules.length)
  throw new Error('DUPLICATE_TASK_MODULE_ID');
for (const module of modules)
  if (
    !module.id ||
    !module.name ||
    !module.unit ||
    typeof module.estimated !== 'boolean' ||
    ['validate', 'work', 'isComplete', 'estimate', 'complete', 'expire'].some(
      (method) => typeof module[method] !== 'function',
    )
  )
    throw new Error(`TASK_MODULE_CONTRACT:${module.id}`);
for (const module of modules)
  if (
    module.game &&
    (!module.game.view ||
      typeof module.game.instructions !== 'string' ||
      ['create', 'act', 'valid', 'public'].some(
        (method) => typeof module.game[method] !== 'function',
      ))
  )
    throw new Error(`TASK_GAME_CONTRACT:${module.id}`);
export const TASK_MODULES = Object.freeze(
  Object.fromEntries(modules.map((module) => [module.id, Object.freeze(module)])),
);
export const moduleSignature = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
export function taskModuleSpec(task) {
  return task.module ?? { id: task.special === 'contest' ? 'contest_v1' : 'time_v1', params: {} };
}
export const defaultTaskGame = (task) => ({
  id: task.course || task.special === 'tutorial' ? 'order_v1' : 'pattern_v1',
  params: {},
});
export const taskGameReady = (task) =>
  Boolean(task) && (!taskModule(task).game || task.moduleData?.passed === true);
export function taskModule(task) {
  const spec = taskModuleSpec(task);
  if (!Object.hasOwn(TASK_MODULES, spec.id)) throw new Error(`TASK_MODULE_UNKNOWN:${spec.id}`);
  return TASK_MODULES[spec.id];
}
export function taskEstimate(state, task) {
  const estimate = taskModule(task).estimate({
    task,
    stats: state.stats,
    params: taskModuleSpec(task).params,
  });
  if (!Number.isInteger(estimate) || estimate < 0 || estimate > 1000)
    throw new Error(`TASK_MODULE_ESTIMATE_INVALID:${task.id}`);
  return estimate;
}
export function moduleIssues(spec) {
  if (spec === undefined) return [];
  if (
    !spec ||
    typeof spec !== 'object' ||
    Array.isArray(spec) ||
    Object.keys(spec).some((key) => !['id', 'params'].includes(key)) ||
    !Object.hasOwn(TASK_MODULES, spec.id)
  )
    return ['등록된 모듈 ID와 params 객체가 필요합니다.'];
  return TASK_MODULES[spec.id].validate(spec.params);
}
export function validModuleData(data) {
  if (data === undefined) return true;
  let count = 0;
  function visit(value, depth) {
    if (++count > 200 || depth > 6) return false;
    if (value === null || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.length <= 1000;
    if (typeof value !== 'object') return false;
    return (
      Object.keys(value).length <= 100 &&
      Object.values(value).every((item) => visit(item, depth + 1))
    );
  }
  return Boolean(data && typeof data === 'object' && !Array.isArray(data) && visit(data, 0));
}
