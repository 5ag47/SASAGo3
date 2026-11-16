import { activeTasks, activities, courses } from './catalog.js';
import { effectivePlan } from './schedule.js';
import { taskModule, taskEstimate, taskGameReady } from './task-modules/registry.js';
import { previewAttempt } from './task-attempts.js';

// Allocation coverage, not a prediction of random results or the final stats.
export function taskAllocation(state, task, plan = effectivePlan(state)) {
  const slots = plan.filter((slot, index) => {
    if (index < (state.weekRun?.cursor ?? 0)) return false;
    if (task.special === 'tutorial')
      return slot.activity === 'study' && courses[slot.target]?.ability === 'math';
    if (task.special === 'clean' && slot.activity === 'clean') return true;
    if (task.id === 'thesis' && slot.activity === 'research') return true;
    if (task.id === 'essay' && slot.activity === 'essay') return true;
    return slot.activity === 'task' && slot.target === task.id;
  }).length;
  const remaining = Math.max(0, task.target - task.progress);
  const handler = taskModule(task);
  const required = taskEstimate(state, task);
  const cap = task.module?.params?.weeklyLimit;
  const available = Number.isInteger(cap)
    ? Math.max(
        0,
        cap -
          (task.attempts?.week === state.week ? task.attempts.weekCount : 0) +
          Number(Boolean(task.attempts?.open)),
      )
    : 21;
  return {
    slots,
    remaining,
    missing: Math.max(0, required - Math.min(slots, available)),
    covered: Math.min(slots, available) >= required,
    estimated: handler.estimated,
    gameReady: taskGameReady(task),
  };
}
export function reviewPlan(state) {
  const plan = effectivePlan(state);
  const tasks = activeTasks(state)
    .sort((a, b) => a.deadline - b.deadline)
    .map((task) => ({ ...task, allocation: taskAllocation(state, task, plan) }));
  const recovery = plan.filter((slot) =>
    ['sleep', 'exercise', 'game', 'out'].includes(slot.activity),
  ).length;
  const activityCost = plan.reduce((sum, slot) => sum + (activities[slot.activity].cost ?? 0), 0);
  return {
    tasks,
    unprepared: tasks.filter((task) => task.allocation.slots > 0 && !task.allocation.gameReady),
    due: tasks.filter((task) => task.deadline === state.week),
    recovery,
    activityCost,
    taskRisks: tasks
      .filter((task) => taskModule(task).game)
      .flatMap((task) => {
        const planned = Math.min(taskEstimate(state, task), task.allocation.slots),
          previous = task.attempts?.week === state.week ? task.attempts.weekCount : 0;
        const cap = task.module?.params?.weeklyLimit,
          possible = Number.isInteger(cap) ? Math.max(0, cap - previous) : 21;
        if (planned + previous <= (task.module?.params?.overloadAfter ?? 2) && planned <= possible)
          return [];
        const effects = {};
        for (let index = 0; index < Math.min(planned, possible); index++) {
          const preview = previewAttempt(state, {
            ...task,
            attempts: { ...task.attempts, week: state.week, weekCount: previous + index },
          });
          for (const [id, value] of Object.entries(preview.effects))
            effects[id] = (effects[id] ?? 0) + value;
        }
        return [
          {
            id: task.id,
            name: task.name,
            planned,
            possible,
            cap,
            effects: Object.fromEntries(
              Object.entries(effects).map(([id, value]) => [id, Math.round(value * 10) / 10]),
            ),
          },
        ];
      }),
    missingGroup: Boolean(state.group) && !plan.some((slot) => slot.activity === 'study_group'),
    hasFatigue: state.fatigue >= 2,
    strain: state.fatigue,
  };
}
