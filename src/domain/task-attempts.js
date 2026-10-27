import { taskModule } from './task-modules/registry.js';
import { taskContext, applyTaskEffects } from './task-processing.js';
import { TaskActionError } from './task-modules/action-error.js';
import { SESSION_DEFAULTS } from './task-modules/session-v2.js';
export function attemptLimitReached(state, task) {
  const limit = task.module?.params?.weeklyLimit;
  return (
    Number.isInteger(limit) &&
    task.attempts?.week === state.week &&
    task.attempts.weekCount >= limit
  );
}
function attemptContext(state, task) {
  const copy = {
    ...task,
    attempts: {
      ...(task.attempts ?? {}),
      weekCount: (task.attempts?.week === state.week ? task.attempts.weekCount : 0) + 1,
    },
  };
  return taskContext(state, copy);
}
export function previewAttempt(state, task) {
  let random = false;
  const context = {
    ...attemptContext(state, task),
    roll: () => {
      random = true;
      return 0.5;
    },
  };
  return { effects: taskModule(task).attemptEffects?.(context) ?? SESSION_DEFAULTS.cost, random };
}
export const attemptCost = (state, task) => previewAttempt(state, task).effects;
export function beginTaskAttempt(state, task) {
  if (attemptLimitReached(state, task))
    throw new TaskActionError('이번 주 도전 횟수를 모두 사용했습니다.');
  const costs =
    taskModule(task).attemptEffects?.(attemptContext(state, task)) ?? SESSION_DEFAULTS.cost;
  const previous = task.attempts;
  task.attempts = {
    total: (previous?.total ?? 0) + 1,
    successful: previous?.successful ?? 0,
    qualitySum: previous?.qualitySum ?? 0,
    week: state.week,
    weekCount: (previous?.week === state.week ? previous.weekCount : 0) + 1,
    open: true,
    lastQuality: previous?.lastQuality ?? null,
    earlyWins: previous?.earlyWins ?? 0,
    sequence: 0,
    receipts: [],
  };
  applyTaskEffects(state, costs);
  return costs;
}
export function finishTaskAttempt(state, task) {
  const module = taskModule(task);
  const result = module.finishAttempt?.(taskContext(state, task)) ?? {
    quality: task.moduleData?.quality ?? 100,
    effects: {},
  };
  if (!Number.isFinite(result.quality) || result.quality < 0 || result.quality > 100)
    throw new Error('TASK_ATTEMPT_QUALITY_INVALID');
  applyTaskEffects(state, result.effects);
  const attempts = task.attempts;
  attempts.successful++;
  attempts.qualitySum += result.quality;
  attempts.lastQuality = result.quality;
  attempts.open = false;
  attempts.earlyWins += Number(Boolean(result.early));
  return result;
}
export function failTaskAttempt(state, task) {
  const result = taskModule(task).failAttempt?.(taskContext(state, task)) ?? {
    effects: { stress: 2 },
  };
  applyTaskEffects(state, result.effects);
  task.attempts.open = false;
  task.attempts.lastQuality = 0;
}
export function validTaskAttempts(value) {
  return (
    value === undefined ||
    Boolean(
      value &&
      Number.isInteger(value.total) &&
      value.total >= 1 &&
      value.total <= 5000 &&
      Number.isInteger(value.sequence) &&
      value.sequence >= 0 &&
      value.sequence <= 10000 &&
      Array.isArray(value.receipts) &&
      value.receipts.length <= 32 &&
      value.receipts.length <= value.sequence &&
      value.receipts.every((item) => typeof item === 'string' && item.length <= 1000) &&
      Number.isInteger(value.successful) &&
      value.successful >= 0 &&
      value.successful <= value.total &&
      Number.isFinite(value.qualitySum) &&
      value.qualitySum >= 0 &&
      value.qualitySum <= value.successful * 100 &&
      Number.isInteger(value.week) &&
      value.week >= 0 &&
      value.week <= 40 &&
      Number.isInteger(value.weekCount) &&
      value.weekCount >= 1 &&
      value.weekCount <= value.total &&
      typeof value.open === 'boolean' &&
      (value.lastQuality === null ||
        (Number.isFinite(value.lastQuality) &&
          value.lastQuality >= 0 &&
          value.lastQuality <= 100)) &&
      Number.isInteger(value.earlyWins) &&
      value.earlyWins >= 0 &&
      value.earlyWins <= value.successful,
    )
  );
}
