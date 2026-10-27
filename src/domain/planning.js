import { activeTasks, activities, courses } from './catalog.js';
import { effectivePlan } from './schedule.js';

// Allocation coverage, not a prediction of random results or the final stats.
export function taskAllocation(state, task, plan = effectivePlan(state)) {
  const slots = plan.filter((slot) => {
    if (task.special === 'tutorial')
      return slot.activity === 'study' && courses[slot.target]?.ability === 'math';
    if (task.special === 'clean' && slot.activity === 'clean') return true;
    if (task.id === 'thesis' && slot.activity === 'research') return true;
    if (task.id === 'essay' && slot.activity === 'essay') return true;
    return slot.activity === 'task' && slot.target === task.id;
  }).length;
  const remaining = Math.max(0, task.target - task.progress);
  return {
    slots,
    remaining,
    missing: Math.max(0, Math.ceil(remaining) - slots),
    covered: slots >= remaining,
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
    due: tasks.filter((task) => task.deadline === state.week),
    recovery,
    activityCost,
    missingGroup: Boolean(state.group) && !plan.some((slot) => slot.activity === 'study_group'),
    hasFatigue: Boolean(state.fatigue),
  };
}
