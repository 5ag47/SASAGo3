import { courses } from './catalog.js';
// Apply once per actual study/task slot, never per mini-game input or preview.
export function courseLoad(state, activity, target) {
  const course =
    activity === 'study'
      ? state.courses.includes(target)
        ? target
        : state.courses[0]
      : activity === 'task'
        ? state.tasks[target]?.course
        : null;
  const load = courses[course]?.workload;
  return load ? { hp: -load.health, stress: load.stress } : {};
}
