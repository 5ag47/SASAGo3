import { activities, STATS } from './catalog.js';
const stats = (value) =>
  value &&
  Object.keys(STATS).every(
    (key) =>
      Number.isFinite(value[key]) &&
      value[key] >= (key === 'focus' ? -100 : 0) &&
      value[key] <= 100,
  );
const mastery = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every((amount) => Number.isFinite(amount) && amount >= 0 && amount <= 100);
const notice = (value) =>
  value &&
  value.kind === 'notice' &&
  typeof value.title === 'string' &&
  value.title.length <= 200 &&
  typeof value.text === 'string' &&
  value.text.length <= 2000;
const delta = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([key, amount]) => Number.isFinite(amount) && Math.abs(amount) <= (key === 'focus' ? 200 : 100),
  );
export function validWeekRun(state) {
  const run = state.weekRun;
  if (run === null) return true;
  if (
    !run ||
    !Number.isFinite(run.minHealth) ||
    run.minHealth < 0 ||
    run.minHealth > 100 ||
    !Number.isFinite(run.peakStress) ||
    run.peakStress < 0 ||
    run.peakStress > 100 ||
    !Number.isInteger(run.closedDay) ||
    run.closedDay < -1 ||
    run.closedDay > 6 ||
    !Array.isArray(run.alerts) ||
    run.alerts.length > 50 ||
    run.alerts.some((value) => !notice(value))
  )
    return false;
  if (
    !run ||
    run.week !== state.week ||
    !Number.isInteger(run.cursor) ||
    run.cursor < 0 ||
    run.cursor > 21 ||
    !Array.isArray(run.plan) ||
    run.plan.length !== 21 ||
    run.plan.some(
      (slot) =>
        !slot ||
        !Object.hasOwn(activities, slot.activity) ||
        !(slot.target === null || typeof slot.target === 'string'),
    ) ||
    !Array.isArray(run.actions) ||
    run.actions.length !== run.cursor ||
    run.actions.some(
      (action, index) =>
        !action ||
        action.index !== index ||
        !Object.hasOwn(activities, action.activity) ||
        typeof action.note !== 'string' ||
        !delta(action.delta) ||
        !delta(action.courseDelta),
    ) ||
    !stats(run.before) ||
    !mastery(run.beforeCourses) ||
    !Number.isFinite(run.moneyBefore) ||
    run.moneyBefore < 0 ||
    !Number.isInteger(run.seedBefore) ||
    !Number.isFinite(run.environment) ||
    run.environment <= 0 ||
    run.environment > 2 ||
    !run.counts ||
    typeof run.counts !== 'object' ||
    Array.isArray(run.counts) ||
    Object.entries(run.counts).some(
      ([id, amount]) =>
        !Object.hasOwn(activities, id) || !Number.isInteger(amount) || amount < 0 || amount > 21,
    ) ||
    !Number.isInteger(run.workCount) ||
    run.workCount < 0 ||
    run.workCount > 21 ||
    !Number.isInteger(run.lastDay) ||
    run.lastDay < -1 ||
    run.lastDay > 6 ||
    !Array.isArray(run.messages) ||
    run.messages.length > 200 ||
    run.messages.some((m) => typeof m !== 'string')
  )
    return false;
  if (run.waiting === null) return run.slot === null;
  if (!run.waiting || typeof run.waiting !== 'object') return false;
  if (!['task', 'task_result', 'notice'].includes(run.waiting.kind)) return false;
  if (run.waiting.kind === 'notice') return notice(run.waiting) && run.slot === null;
  if (!Object.hasOwn(state.tasks, run.waiting.task)) return false;
  if (run.waiting.kind === 'task_result')
    return (
      run.slot === null &&
      typeof run.waiting.completed === 'boolean' &&
      Number.isFinite(run.waiting.quality) &&
      run.waiting.quality >= 0 &&
      run.waiting.quality <= 100
    );
  return Boolean(
    run.slot &&
    run.slot.index === run.cursor &&
    Object.hasOwn(activities, run.slot.activity) &&
    stats(run.slot.before) &&
    mastery(run.slot.beforeCourses) &&
    Number.isFinite(run.slot.amount) &&
    run.slot.amount > 0 &&
    state.tasks[run.waiting.task].status === 'active',
  );
}
