import {
  activities,
  activeTasks,
  courses,
  events,
  GROUPS,
  LAST_WEEK,
  MAJORS,
  REQUIRED,
  roles,
  STATS,
  TUTORIAL_TASKS,
  ELECTIVES,
} from './catalog.js';
import { emptyMinigames, validMinigames } from './minigames.js';
import { validTaskStages, TASK_FORMATS } from './assignments.js';
import {
  moduleIssues,
  validModuleData,
  taskModule,
  defaultTaskGame,
} from './task-modules/registry.js';

export const SCHEMA_VERSION = 1;
export const SAVE_KEY = 'sasago3-year-v1';
export const CONTENT_VERSION = '2026.10.27-7';
export function baseState(seed = 20261013) {
  return {
    version: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    created: false,
    week: 0,
    seed: seed >>> 0,
    name: '사사',
    character: 'boy',
    role: 'steady',
    major: 'math',
    nextMajor: null,
    electives: [],
    nextElectives: null,
    courses: [],
    courseMastery: {},
    stats: {
      hp: 72,
      focus: 55,
      stress: 20,
      reputation: 35,
      math: 28,
      science: 25,
      writing: 23,
      speech: 23,
      charm: 30,
    },
    money: 30000,
    plan: [],
    tasks: {},
    assessments: [],
    notices: [],
    history: [],
    pending: [],
    choices: {},
    minigames: emptyMinigames(),
    group: null,
    rejectedGroups: [],
    teachers: { math: 15, science: 15, homeroom: 20 },
    flags: { environment: 'home', camp: 'none', target: 'balanced', taskGamesVersion: 1 },
    fatigue: 0,
    discipline: 0,
    awards: 0,
    interviewScore: 0,
    admissions: [],
    ending: null,
    revision: 0,
  };
}
export function migrateState(value) {
  if (value?.version !== SCHEMA_VERSION) return value;
  let next = value;
  if (value.created && value.tasks && value.flags && !value.flags.taskGamesVersion) {
    next = {
      ...next,
      flags: { ...value.flags, taskGamesVersion: 1 },
      tasks: Object.fromEntries(
        Object.entries(value.tasks).map(([id, task]) => [
          id,
          task?.status === 'active' &&
          (!task.module ||
            ['time_v1', 'mastery_v1', 'contest_v1', 'math_analysis_v1'].includes(task.module.id))
            ? { ...task, module: defaultTaskGame(task) }
            : task,
        ]),
      ),
    };
  }
  if (value.minigames === undefined) next = { ...next, minigames: emptyMinigames() };
  if (value.electives === undefined || value.nextElectives === undefined)
    next = {
      ...next,
      electives: value.electives ?? [],
      nextElectives: value.nextElectives ?? null,
    };
  if (
    next.created &&
    next.major === 'information' &&
    Array.isArray(next.courses) &&
    !next.courses.includes('ai_project')
  )
    next = {
      ...next,
      courses: [...next.courses, 'ai_project'],
      ...(next.courseMastery
        ? { courseMastery: { ...next.courseMastery, ai_project: next.stats?.science } }
        : {}),
    };
  if (next.courseMastery === undefined && Array.isArray(next.courses) && next.stats)
    next = {
      ...next,
      courseMastery: Object.fromEntries(
        next.courses
          .filter((id) => Object.hasOwn(courses, id))
          .map((id) => [id, value.stats[courses[id].ability]]),
      ),
    };
  if (value.major === 'math_physics' || value.nextMajor === 'math_physics')
    next = {
      ...next,
      major: value.major === 'math_physics' ? 'physics' : value.major,
      nextMajor: value.nextMajor === 'math_physics' ? 'physics' : value.nextMajor,
    };
  if (
    next.created &&
    next.week === 0 &&
    next.tasks &&
    typeof next.tasks === 'object' &&
    !Array.isArray(next.tasks)
  ) {
    const missing = Object.entries(TUTORIAL_TASKS).filter(([id]) => !next.tasks[id]);
    if (missing.length)
      next = {
        ...next,
        tasks: {
          ...next.tasks,
          ...Object.fromEntries(
            missing.map(([id, task]) => [
              id,
              { ...task, id, start: 0, progress: 0, status: 'active' },
            ]),
          ),
        },
      };
  }
  return next;
}
export function balancedPlan(state) {
  const course = state.courses[0] ?? 'linear_algebra';
  return [
    'study',
    'study',
    'exercise',
    'sleep',
    'study_group',
    'research',
    'study',
    'study',
    'sleep',
    'exercise',
    'teacher',
    'study',
    'study',
    'task',
    'game',
    'sleep',
    'clean',
    'task',
    'exercise',
    'study',
    'sleep',
  ].map((activity) => {
    if (activity === 'research' && state.tasks.thesis?.status !== 'active') activity = 'study';
    if (activity === 'study_group' && !state.group) activity = 'sleep';
    const task = activeTasks(state).find((t) => t.special !== 'tutorial');
    if (activity === 'task' && !task) activity = 'sleep';
    return {
      activity,
      target:
        activity === 'study'
          ? course
          : activity === 'task'
            ? task.id
            : activity === 'teacher'
              ? 'homeroom'
              : null,
    };
  });
}
export function validateState(s) {
  if (
    !s ||
    s.version !== SCHEMA_VERSION ||
    typeof s.created !== 'boolean' ||
    typeof s.contentVersion !== 'string'
  )
    return false;
  if (!validMinigames(s.minigames)) return false;
  if (
    !Number.isInteger(s.week) ||
    s.week < 0 ||
    s.week > LAST_WEEK + 1 ||
    !Number.isInteger(s.seed) ||
    s.seed < 0 ||
    s.seed > 4294967295
  )
    return false;
  if (
    typeof s.name !== 'string' ||
    !s.name.trim() ||
    s.name.length > 12 ||
    !['boy', 'girl'].includes(s.character) ||
    !Object.hasOwn(roles, s.role) ||
    !Object.hasOwn(MAJORS, s.major)
  )
    return false;
  if (s.nextMajor !== null && !Object.hasOwn(MAJORS, s.nextMajor)) return false;
  const validElectives = (list) =>
    Array.isArray(list) &&
    list.length <= ELECTIVES.length &&
    new Set(list).size === list.length &&
    list.every((id) => ELECTIVES.includes(id));
  if (
    !validElectives(s.electives) ||
    (s.nextElectives !== null && !validElectives(s.nextElectives))
  )
    return false;
  if (
    !s.courseMastery ||
    typeof s.courseMastery !== 'object' ||
    Array.isArray(s.courseMastery) ||
    Object.entries(s.courseMastery).some(
      ([id, value]) =>
        !Object.hasOwn(courses, id) || !Number.isFinite(value) || value < 0 || value > 100,
    )
  )
    return false;
  if (
    !Object.keys(STATS).every(
      (key) => Number.isFinite(s.stats?.[key]) && s.stats[key] >= 0 && s.stats[key] <= 100,
    )
  )
    return false;
  if (
    !Number.isFinite(s.money) ||
    s.money < 0 ||
    s.money > 1e9 ||
    !Number.isInteger(s.revision) ||
    s.revision < 0
  )
    return false;
  if (
    !Array.isArray(s.courses) ||
    s.courses.some((id) => !Object.hasOwn(courses, id)) ||
    (s.created && s.courses.length < REQUIRED.length)
  )
    return false;
  if (
    !Array.isArray(s.plan) ||
    s.plan.length !== (s.created ? 21 : 0) ||
    s.plan.some(
      (slot) =>
        !slot ||
        !Object.hasOwn(activities, slot.activity) ||
        !(slot.target === null || typeof slot.target === 'string'),
    )
  )
    return false;
  if (
    !s.tasks ||
    Array.isArray(s.tasks) ||
    typeof s.tasks !== 'object' ||
    Object.keys(s.tasks).length > 500
  )
    return false;
  if (
    !Object.entries(s.tasks).every(
      ([id, t]) =>
        t &&
        t.id === id &&
        typeof t.name === 'string' &&
        ['active', 'completed', 'expired'].includes(t.status) &&
        Number.isFinite(t.progress) &&
        t.progress >= 0 &&
        Number.isFinite(t.target) &&
        t.target > 0 &&
        t.progress <= t.target &&
        validTaskStages(t) &&
        moduleIssues(t.module).length === 0 &&
        validModuleData(t.moduleData) &&
        (t.moduleData === undefined ||
          !taskModule(t).game ||
          taskModule(t).game.valid(t.moduleData)) &&
        (t.result === undefined ||
          (t.result &&
            typeof t.result.module === 'string' &&
            (t.result.score === null ||
              (Number.isFinite(t.result.score) && t.result.score >= 0 && t.result.score <= 100)) &&
            typeof t.result.note === 'string' &&
            t.result.note.length <= 300)) &&
        (t.format === undefined || Object.hasOwn(TASK_FORMATS, t.format)) &&
        Number.isInteger(t.deadline) &&
        t.deadline >= 0 &&
        t.deadline <= LAST_WEEK &&
        typeof t.description === 'string' &&
        Number.isInteger(t.start),
    )
  )
    return false;
  if (
    !Array.isArray(s.pending) ||
    s.pending.length > 50 ||
    s.pending.some((id) => typeof id !== 'string' || !Object.hasOwn(events, id)) ||
    !s.choices ||
    typeof s.choices !== 'object' ||
    Array.isArray(s.choices)
  )
    return false;
  const validDelta = (delta) =>
    delta &&
    Object.keys(STATS).every((k) => Number.isFinite(delta[k]) && Math.abs(delta[k]) <= 100);
  if (
    !Array.isArray(s.history) ||
    s.history.length > 41 ||
    s.history.some(
      (h) =>
        !h ||
        !Number.isInteger(h.week) ||
        h.week < 0 ||
        h.week > 40 ||
        typeof h.label !== 'string' ||
        !Array.isArray(h.actions) ||
        h.actions.length !== 21 ||
        h.actions.some(
          (a) =>
            !a ||
            !Number.isInteger(a.index) ||
            a.index < 0 ||
            a.index >= 21 ||
            !Object.hasOwn(activities, a.activity) ||
            typeof a.note !== 'string' ||
            !validDelta(a.delta),
        ) ||
        !Array.isArray(h.messages) ||
        h.messages.length > 100 ||
        h.messages.some((m) => typeof m !== 'string') ||
        !validDelta(h.delta) ||
        !Number.isFinite(h.moneyDelta),
    )
  )
    return false;
  if (
    !Array.isArray(s.assessments) ||
    s.assessments.length > 1000 ||
    s.assessments.some(
      (a) =>
        !a ||
        !Object.hasOwn(courses, a.course) ||
        !['quiz', 'midterm', 'final', 'project'].includes(a.kind) ||
        !Number.isFinite(a.score) ||
        a.score < 0 ||
        a.score > 100 ||
        ![1, 2].includes(a.term),
    )
  )
    return false;
  if (
    !s.teachers ||
    !Object.values(s.teachers).every((v) => Number.isFinite(v) && v >= 0 && v <= 100) ||
    !['math', 'science', 'homeroom'].every((k) => Number.isFinite(s.teachers[k]))
  )
    return false;
  if (
    !s.flags ||
    typeof s.flags !== 'object' ||
    !['home', 'cafe', 'managed'].includes(s.flags.environment) ||
    !['none', 'heavy', 'light'].includes(s.flags.camp) ||
    !['dream', 'balanced', 'safe'].includes(s.flags.target)
  )
    return false;
  if (
    s.flags.recommender !== undefined &&
    !['math', 'science', 'homeroom'].includes(s.flags.recommender)
  )
    return false;
  if (
    s.flags.runRevision !== undefined &&
    (!Number.isInteger(s.flags.runRevision) ||
      s.flags.runRevision < 0 ||
      s.flags.runRevision > s.revision)
  )
    return false;
  if (s.flags.reservations !== undefined) {
    if (
      !s.flags.reservations ||
      typeof s.flags.reservations !== 'object' ||
      Array.isArray(s.flags.reservations)
    )
      return false;
    for (const [week, slots] of Object.entries(s.flags.reservations)) {
      if (
        !/^\d+$/.test(week) ||
        Number(week) > 40 ||
        !Array.isArray(slots) ||
        slots.length > 21 ||
        new Set(slots.map((slot) => slot?.index)).size !== slots.length ||
        slots.some(
          (slot) =>
            !slot ||
            !Number.isInteger(slot.index) ||
            slot.index < 0 ||
            slot.index >= 21 ||
            !Object.hasOwn(activities, slot.activity) ||
            !Object.hasOwn(events, slot.event),
        )
      )
        return false;
    }
  }
  if (
    !(s.group === null || Object.hasOwn(GROUPS, s.group)) ||
    !Array.isArray(s.rejectedGroups) ||
    s.rejectedGroups.some((id) => !Object.hasOwn(GROUPS, id))
  )
    return false;
  if (
    !['fatigue', 'discipline', 'awards', 'interviewScore'].every(
      (k) => Number.isFinite(s[k]) && s[k] >= 0,
    ) ||
    !Array.isArray(s.admissions) ||
    !Array.isArray(s.notices)
  )
    return false;
  if (
    s.admissions.some(
      (a) =>
        !a ||
        typeof a.name !== 'string' ||
        typeof a.accepted !== 'boolean' ||
        !Number.isFinite(a.score),
    )
  )
    return false;
  if (
    s.notices.length > 120 ||
    s.notices.some(
      (n) =>
        !n ||
        typeof n.id !== 'string' ||
        !Number.isInteger(n.week) ||
        typeof n.title !== 'string' ||
        typeof n.text !== 'string' ||
        (n.task !== undefined && (typeof n.task !== 'string' || n.task.length > 100)) ||
        typeof n.kind !== 'string',
    )
  )
    return false;
  return (
    s.ending === null ||
    ['university', 'retry', 'work', 'startup', 'prison', 'leave'].includes(s.ending?.id)
  );
}
