import { activities, roles, STATS } from './catalog.js';
import { baseState } from './state.js';
import { gpa } from './grades.js';
export function yearReport(state) {
  const counts = {};
  for (const entry of state.history)
    for (const action of entry.actions)
      counts[action.activity] = (counts[action.activity] ?? 0) + 1;
  const starting = baseState().stats;
  for (const [id, delta] of Object.entries(roles[state.role].stats))
    starting[id] = Math.min(100, Math.max(0, starting[id] + delta));
  const tasks = Object.values(state.tasks).filter((task) => task.special !== 'tutorial');
  return {
    weeks: state.history.length,
    terms: [1, 2].map((term) => ({
      term,
      gpa: state.assessments.some((mark) => mark.term === term) ? gpa(state, term) : null,
    })),
    stats: Object.entries(STATS).map(([id, stat]) => ({
      id,
      name: stat.name,
      start: starting[id],
      end: state.stats[id],
      delta: Math.round((state.stats[id] - starting[id]) * 10) / 10,
    })),
    tasks: {
      completed: tasks.filter((task) => task.status === 'completed').length,
      expired: tasks.filter((task) => task.status === 'expired').length,
      active: tasks.filter((task) => task.status === 'active').length,
    },
    activities: Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => ({ id, name: activities[id].name, count })),
    accepted: state.admissions.filter((result) => result.accepted).map((result) => result.name),
    milestones: [
      ['thesis', '졸업논문'],
      ['essay', '자기소개서'],
      ['application_form', '원서 제출'],
    ].map(([id, name]) => ({
      id,
      name,
      status: state.tasks[id]?.status ?? 'unavailable',
      progress: state.tasks[id]?.progress ?? 0,
      target: state.tasks[id]?.target ?? null,
    })),
  };
}
