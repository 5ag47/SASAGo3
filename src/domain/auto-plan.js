import { activeTasks, courses } from './catalog.js';
import { lockedSlots } from './schedule.js';
import { taskEstimate } from './task-modules/registry.js';
import { courseMastery } from './course-progress.js';
import { balance } from './balance.js';
import { isVacation, WORK_ACTIVITIES } from './senior-year.js';

const workOrder = [0, 3, 6, 9, 12, 15, 18, 1, 10, 4, 13, 7, 16, 19, 2, 5, 8, 11, 14, 17, 20];
const workActivities = [...WORK_ACTIVITIES, 'lecture'];
export function buildPreset(state, preset = 'balanced') {
  const locked = lockedSlots(state);
  const free = workOrder.filter((index) => !locked[index]);
  const plan = Array.from({ length: 21 }, (_, index) =>
    locked[index] ? { ...state.plan[index] } : { activity: 'sleep', target: null },
  );
  if (preset === 'rest') {
    // Recovery deliberately leaves room for sleep rather than seven late game nights.
    for (const [index, activity] of [
      [7, 'exercise'],
      [16, 'exercise'],
      [19, 'game'],
    ])
      if (!locked[index]) plan[index] = { activity, target: null };
    return plan;
  }
  const fixedWork = Object.values(locked).filter((slot) =>
    workActivities.includes(slot.activity),
  ).length;
  const budget =
    state.fatigue >= 2 ||
    state.stats.hp < balance.learning.lowHealth ||
    state.stats.stress >= balance.learning.stressThreshold
      ? balance.presets.recoveryWorkSlots
      : balance.presets.workSlots;
  const workSlots = free.slice(0, Math.max(0, budget - fixedWork));
  const tasks = activeTasks(state).sort((a, b) => a.deadline - b.deadline || a.start - b.start);
  const queue = tasks.flatMap((task) => {
    const limit = task.module?.params?.weeklyLimit;
    const available = Number.isInteger(limit)
      ? Math.max(0, limit - (task.attempts?.week === state.week ? task.attempts.weekCount : 0))
      : 21;
    const estimate = taskEstimate(state, task);
    const spread =
      task.target >= 8
        ? Math.max(
            balance.presets.longProjectSlots,
            Math.ceil(estimate / Math.max(1, task.deadline - state.week + 1)),
          )
        : estimate;
    return Array.from({ length: Math.min(estimate, available, spread) }, () => task);
  });
  const taskBudget =
    preset === 'tasks'
      ? workSlots.length
      : Math.min(workSlots.length, balance.presets.balancedTaskSlots);
  const subjectOrder = [...state.courses].sort(
    (a, b) => courseMastery(state, a) - courseMastery(state, b),
  );
  const math = state.courses.find((id) => courses[id].ability === 'math');
  let taskCount = 0,
    studyCount = 0;
  for (const index of workSlots) {
    const task = taskCount < taskBudget ? queue.shift() : null;
    if (task) {
      taskCount++;
      plan[index] =
        task.special === 'tutorial'
          ? { activity: 'study', target: math }
          : { activity: task.special === 'clean' ? 'clean' : 'task', target: task.id };
    } else {
      plan[index] = {
        activity: 'study',
        target: subjectOrder[(studyCount++ + state.week) % subjectOrder.length],
      };
    }
  }
  // CSAT preparation competes with coursework: one study slot a week, two in vacation.
  if (state.flags.csat === 'prepare' && state.week <= 33) {
    let csat = isVacation(state.week) ? 2 : 1;
    for (const index of [...workSlots].reverse())
      if (csat > 0 && plan[index].activity === 'study') {
        plan[index] = { activity: 'csat_study', target: null };
        csat--;
      }
  }
  const assignSocial = (preferred, activity, target = null) => {
    const index = [preferred, ...free].find(
      (index) => !locked[index] && !workSlots.includes(index) && plan[index].activity === 'sleep',
    );
    if (index !== undefined) plan[index] = { activity, target };
  };
  assignSocial(4, state.group ? 'study_group' : 'sleep');
  assignSocial(
    13,
    'teacher',
    state.recommendation?.status === 'preparing' ? state.recommendation.teacher : 'homeroom',
  );
  assignSocial(7, 'exercise');
  assignSocial(19, 'game');
  return plan;
}
