import { activities, courses, GROUPS } from './catalog.js';
import { applyEffects } from './random.js';
import { learningEfficiency } from './week.js';
import { learnCourse } from './course-progress.js';
import { ACADEMIC_STATS } from './balance.js';

// One slot at the current stats, before future repetition, environment and weekly events.
// It is a display estimate; only the server executes a plan and commits its results.
export function activityPreview(state, id, target) {
  const next = {
    stats: { ...state.stats },
    courses: state.courses,
    courseMastery: { ...state.courseMastery },
  };
  const definition = activities[id],
    efficiency = learningEfficiency(state);
  for (const [key, value] of Object.entries(definition.effect))
    applyEffects(
      next,
      { [key]: value },
      value > 0 && ACADEMIC_STATS.includes(key) ? efficiency : 1,
    );
  let courseGain = null;
  if (id === 'study' && state.courses.includes(target)) {
    applyEffects(next, { [courses[target].ability]: definition.gain * efficiency });
    courseGain = learnCourse(next, target, efficiency);
  }
  if (id === 'study_group' && state.group)
    applyEffects(next, GROUPS[state.group].effect, state.group === 'focused' ? efficiency : 1);
  if (id === 'club' && state.flags.club)
    applyEffects(next, state.flags.club === 'lab' ? { science: 2 } : { writing: 1.5, charm: 1 });
  return {
    effects: Object.fromEntries(
      Object.keys(next.stats)
        .map((key) => [key, Math.round((next.stats[key] - state.stats[key]) * 10) / 10])
        .filter(([, amount]) => amount !== 0),
    ),
    courseGain,
  };
}
