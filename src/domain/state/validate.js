import {
  activities,
  CHARACTERS,
  courses,
  events,
  GROUPS,
  LAST_WEEK,
  MAJORS,
  REQUIRED,
  roles,
  STATS,
  ELECTIVES,
} from '../catalog.js';
import { validMinigames } from '../minigames.js';
import { validStory, chapters } from '../story.js';
import { validStudyApplication } from '../study-applications.js';
import { validTaskAttempts } from '../task-attempts.js';
import { validWeekRun } from '../week-run-validation.js';
import { validTaskStages, TASK_FORMATS } from '../assignments.js';
import { moduleIssues, validModuleData, taskModule } from '../task-modules/registry.js';
import { SCHEMA_VERSION, CONTENT_VERSION } from '../version.js';
import { validDocuments } from '../admission-documents.js';
import { validRecommendation } from '../recommendation.js';
export function validateState(s) {
  if (!s || !validDocuments(s.documents) || !validRecommendation(s.recommendation)) return false;
  if (
    !s ||
    s.version !== SCHEMA_VERSION ||
    typeof s.created !== 'boolean' ||
    typeof s.contentVersion !== 'string'
  )
    return false;
  if (!validMinigames(s.minigames)) return false;
  if (!validStory(s.story)) return false;
  if (!validStudyApplication(s.studyApplication) || !validWeekRun(s)) return false;
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
    !Object.hasOwn(CHARACTERS, s.character) ||
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
      (key) =>
        Number.isFinite(s.stats?.[key]) &&
        s.stats[key] >= (key === 'focus' ? -100 : 0) &&
        s.stats[key] <= 100,
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
        (t.deadlineDay === undefined ||
          (Number.isInteger(t.deadlineDay) && t.deadlineDay >= 0 && t.deadlineDay <= 6)) &&
        moduleIssues(t.module).length === 0 &&
        validModuleData(t.moduleData) &&
        validTaskAttempts(t.attempts) &&
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
    Object.keys(STATS).every(
      (k) => Number.isFinite(delta[k]) && Math.abs(delta[k]) <= (k === 'focus' ? 200 : 100),
    );
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
    !Number.isInteger(s.fatigue) ||
    s.fatigue > 3 ||
    !Array.isArray(s.admissions) ||
    !Array.isArray(s.notices)
  )
    return false;
  if (
    (s.flags.rumors !== undefined &&
      (!s.flags.rumors ||
        typeof s.flags.rumors !== 'object' ||
        Array.isArray(s.flags.rumors) ||
        Object.keys(s.flags.rumors).length > 500 ||
        Object.values(s.flags.rumors).some((value) => value !== true))) ||
    (s.flags.csat !== undefined && !['prepare', 'skip'].includes(s.flags.csat)) ||
    (s.flags.csatPrep !== undefined &&
      (!Number.isFinite(s.flags.csatPrep) || s.flags.csatPrep < 0 || s.flags.csatPrep > 100)) ||
    (s.flags.csatGrade !== undefined &&
      (!Number.isInteger(s.flags.csatGrade) || s.flags.csatGrade < 1 || s.flags.csatGrade > 9))
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
        (n.chapter !== undefined && !Object.hasOwn(chapters, n.chapter)) ||
        typeof n.kind !== 'string',
    )
  )
    return false;
  return (
    s.ending === null ||
    ['university', 'retry', 'work', 'startup', 'prison', 'leave'].includes(s.ending?.id)
  );
}
