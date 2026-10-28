import definitions from '../../data/admissions.json' with { type: 'json' };
import { courses, MAJORS } from './catalog.js';
import { clamp } from './random.js';
import { teacherSupport } from './writing-support.js';
export { teacherSupport, essayWorkAmount } from './writing-support.js';
export { definitions as admissionDefinitions };
export const ADMISSION_DIRECTIONS = Object.freeze(
  Object.fromEntries(
    Object.values(definitions)
      .filter((item) => item.kind === 'direction')
      .map((item) => [item.id, item]),
  ),
);
const average = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round = (value) => Math.round(clamp(value) * 10) / 10;
export function schoolRecord(state) {
  const config = definitions.school_record;
  const eligible = Object.values(state.tasks).filter(
    (task) => task.course && (task.status === 'completed' || task.deadline <= state.week),
  );
  const completed = eligible.filter((task) => task.status === 'completed');
  const quality = (task) => task.result?.quality ?? task.result?.score ?? 60;
  const coursework =
    average(completed.map(quality)) *
    (completed.length / Math.max(1, eligible.length)) *
    Math.min(1, completed.length / config.courseSamples);
  const thesis = state.tasks.thesis;
  const exploration = Math.min(
    100,
    ((completed.reduce(
      (sum, task) =>
        sum +
        (quality(task) / 100) *
          (task.format && task.format !== 'custom' ? 1 : config.generalCourseCredit),
      0,
    ) +
      (thesis?.status === 'completed' ? (config.thesisCredit * quality(thesis)) / 100 : 0)) /
      config.explorationSamples) *
      100,
  );
  const weeks = [
    ...state.history.map((entry) => ({ week: entry.week, actions: entry.actions })),
    ...(state.weekRun ? [{ week: state.week, actions: state.weekRun.actions }] : []),
  ];
  let community = 0,
    activeWeeks = 0;
  const productive = new Set([
    'study',
    'task',
    'research',
    'essay',
    'interview',
    'teacher',
    'club',
    'study_group',
    'academy',
    'science_academy',
  ]);
  for (const entry of weeks) {
    if (entry.week === 0) continue;
    if (entry.actions.some((action) => productive.has(action.activity))) activeWeeks++;
    for (const action of entry.actions) {
      if (['club', 'study_group'].includes(action.activity)) community++;
      else if (
        state.flags.reservations?.[entry.week]?.some(
          (slot) => slot.index === action.index && slot.activity === action.activity,
        )
      )
        community++;
    }
  }
  const scores = {
    coursework: round(coursework),
    exploration: round(exploration),
    participation: round((community / config.communitySlots) * 100),
    continuity: round((activeWeeks / Math.max(1, state.week)) * 100),
  };
  const score = round(
    Object.entries(config.weights).reduce((sum, [id, weight]) => sum + scores[id] * weight, 0) -
      Math.min(20, state.discipline * config.disciplinePenalty),
  );
  return {
    score,
    scores,
    completed: completed.length,
    due: eligible.length,
    community,
    activeWeeks,
    explorationCount: completed.length + Number(thesis?.status === 'completed'),
    entries: completed.map((task) => ({
      id: task.id,
      name: task.name,
      course: task.course,
      quality: round(quality(task)),
      week: task.completedWeek ?? task.deadline,
    })),
  };
}
export function majorFit(state) {
  return round(
    average(
      MAJORS[state.major].courses.map(
        (id) => state.courseMastery[id] ?? state.stats[courses[id].ability],
      ),
    ),
  );
}
export function supportedEssayQuality(state, execution) {
  const parts = {
    execution,
    record: schoolRecord(state).score,
    teacher: teacherSupport(state),
    writing: state.stats.writing,
  };
  return Math.round(
    clamp(
      Object.entries(definitions.essay_support.weights).reduce(
        (sum, [id, weight]) => sum + parts[id] * weight,
        0,
      ),
    ),
  );
}
export function supportedEssayCost(state, effects) {
  const burden =
    0.7 * (1 - schoolRecord(state).score / 100) + 0.3 * (1 - teacherSupport(state) / 100);
  const cost = definitions.essay_support.burden;
  return {
    ...effects,
    hp: Math.max(-100, (effects.hp ?? 0) - cost.hp * burden),
    focus: Math.max(-100, (effects.focus ?? 0) - cost.focus * burden),
    stress: Math.min(100, (effects.stress ?? 0) + cost.stress * burden),
  };
}
