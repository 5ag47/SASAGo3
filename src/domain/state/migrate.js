import { concentration } from './condition.js';
import { courses, TUTORIAL_LAST_WEEK, TUTORIAL_TASKS } from '../catalog.js';
import { emptyMinigames } from '../minigames.js';
import { upgradeTaskFlow } from '../task-flow-migration.js';
import { defaultTaskGame } from '../task-modules/registry.js';
import { SCHEMA_VERSION } from '../version.js';
import { refreshDocuments } from '../admission-documents.js';
import { admissionDefinitions } from '../school-record.js';
const LEGACY_SAVE_MIGRATIONS = Object.freeze([
  {
    id: 'task-module-snapshots',
    apply(next, value) {
      if (value.created && value.tasks && value.flags && !value.flags.taskGamesVersion) {
        next = {
          ...next,
          flags: { ...value.flags, taskGamesVersion: 1 },
          tasks: Object.fromEntries(
            Object.entries(value.tasks).map(([id, task]) => [
              id,
              task?.status === 'active' &&
              (!task.module ||
                ['time_v1', 'mastery_v1', 'contest_v1', 'math_analysis_v1'].includes(
                  task.module.id,
                ))
                ? { ...task, module: defaultTaskGame(task) }
                : task,
            ]),
          ),
        };
      }
      return next;
    },
  },
  {
    id: 'minigames-default',
    apply(next, value) {
      if (value.minigames === undefined) next = { ...next, minigames: emptyMinigames() };
      return next;
    },
  },
  {
    id: 'story-default',
    apply(next, value) {
      if (value.story === undefined) next = { ...next, story: {} };
      return next;
    },
  },
  {
    id: 'week-run-default',
    apply(next, value) {
      if (value.weekRun === undefined) next = { ...next, weekRun: null };
      return next;
    },
  },
  {
    id: 'study-application-default',
    apply(next, value) {
      if (value.studyApplication === undefined) next = { ...next, studyApplication: null };
      return next;
    },
  },
  {
    id: 'week-run-extremes',
    apply(next, value) {
      if (next.weekRun && next.weekRun.minHealth === undefined)
        next = {
          ...next,
          weekRun: {
            ...next.weekRun,
            minHealth: Math.min(next.weekRun.before.hp, next.stats.hp),
            peakStress: Math.max(next.weekRun.before.stress, next.stats.stress),
            closedDay: -1,
            alerts: [],
          },
        };
      return next;
    },
  },
  {
    id: 'task-input-receipts',
    apply(next, value) {
      if (
        next.tasks &&
        Object.values(next.tasks).some(
          (task) => task.attempts && task.attempts.sequence === undefined,
        )
      )
        next = {
          ...next,
          tasks: Object.fromEntries(
            Object.entries(next.tasks).map(([id, task]) => [
              id,
              task.attempts && task.attempts.sequence === undefined
                ? { ...task, attempts: { ...task.attempts, sequence: 0, receipts: [] } }
                : task,
            ]),
          ),
        };
      return next;
    },
  },
  {
    id: 'elective-defaults',
    apply(next, value) {
      if (value.electives === undefined || value.nextElectives === undefined)
        next = {
          ...next,
          electives: value.electives ?? [],
          nextElectives: value.nextElectives ?? null,
        };
      return next;
    },
  },
  {
    id: 'information-course',
    apply(next, value) {
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
      return next;
    },
  },
  {
    id: 'course-mastery',
    apply(next, value) {
      if (next.courseMastery === undefined && Array.isArray(next.courses) && next.stats)
        next = {
          ...next,
          courseMastery: Object.fromEntries(
            next.courses
              .filter((id) => Object.hasOwn(courses, id))
              .map((id) => [id, value.stats[courses[id].ability]]),
          ),
        };
      return next;
    },
  },
  {
    id: 'split-math-physics',
    apply(next, value) {
      if (value.major === 'math_physics' || value.nextMajor === 'math_physics')
        next = {
          ...next,
          major: value.major === 'math_physics' ? 'physics' : value.major,
          nextMajor: value.nextMajor === 'math_physics' ? 'physics' : value.nextMajor,
        };
      return next;
    },
  },
  {
    id: 'tutorial-tasks',
    apply(next, value) {
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
    },
  },
  {
    id: 'chronological-tasks',
    apply(next, value) {
      if (next.created && next.flags && !next.flags.taskFlowVersion) next = upgradeTaskFlow(next);
      return next;
    },
  },
]);
const schoolRecordMigration = {
  id: 'school-record-documents',
  apply(next) {
    if (next.documents === undefined) next = { ...next, documents: null };
    if (next.recommendation === undefined)
      next = {
        ...next,
        recommendation: next.flags?.recommender
          ? {
              teacher: next.flags.recommender,
              status: 'ready',
              progress: admissionDefinitions.recommendation_support.sessions,
              target: admissionDefinitions.recommendation_support.sessions,
              quality: next.teachers[next.flags.recommender],
              dueAt: 0,
            }
          : null,
      };
    if (next.recommendation && next.recommendation.target === undefined)
      next = {
        ...next,
        recommendation: {
          ...next.recommendation,
          target:
            next.recommendation.status === 'preparing'
              ? admissionDefinitions.recommendation_support.sessions
              : next.recommendation.progress,
        },
      };
    if (next.created && !next.flags.schoolRecordVersion) {
      next = {
        ...next,
        flags: { ...next.flags, schoolRecordVersion: 1 },
        tasks: Object.fromEntries(
          Object.entries(next.tasks).map(([id, task]) => [
            id,
            task.special === 'essay' &&
            task.status === 'active' &&
            ['order_v2', 'pattern_v2'].includes(task.module?.id) &&
            task.module.params.support === undefined
              ? {
                  ...task,
                  module: { ...task.module, params: { ...task.module.params, support: 'essay' } },
                }
              : task,
          ]),
        ),
      };
      refreshDocuments(next);
    }
    return next;
  },
};
export function migrateState(value) {
  if (value?.version !== SCHEMA_VERSION) return value;
  let next = value;
  for (const migration of SAVE_MIGRATIONS) {
    try {
      next = migration.apply(next, value);
    } catch (cause) {
      throw Object.assign(new Error('SAVE_MIGRATION_FAILED', { cause }), {
        migrationId: migration.id,
      });
    }
  }
  return next;
}
// 2026.11: fatigue became a 0~3 strain stage and CSAT became an opt-in exam.
// Old 'fatigue' (0.65 efficiency) maps to stage 2; saves past the CSAT decision keep taking it.
const seniorYearMigration = {
  id: 'senior-year-pressure',
  apply(next) {
    if (!next.created || !next.flags || next.flags.seniorYearVersion) return next;
    return {
      ...next,
      fatigue: next.fatigue ? 2 : 0,
      flags: {
        ...next.flags,
        seniorYearVersion: 1,
        ...(next.week > 18 && next.flags.csat === undefined ? { csat: 'prepare' } : {}),
      },
    };
  },
};
// 2026.11: practice tasks used to expire with the winter week, which made the remaining lessons
// impossible after practising "한 주 진행". Saves still inside the window get them back.
const tutorialWindowMigration = {
  id: 'tutorial-practice-period',
  apply(next) {
    if (!next.created || !next.tasks || next.week > TUTORIAL_LAST_WEEK) return next;
    const reopened = Object.keys(TUTORIAL_TASKS).filter(
      (id) =>
        next.tasks[id] &&
        next.tasks[id].status !== 'completed' &&
        next.tasks[id].deadline < TUTORIAL_LAST_WEEK,
    );
    if (!reopened.length) return next;
    const tasks = { ...next.tasks };
    for (const id of reopened) {
      const { result, ...task } = tasks[id];
      void result;
      tasks[id] = { ...task, status: 'active', deadline: TUTORIAL_LAST_WEEK };
    }
    return { ...next, tasks };
  },
};
export const SAVE_MIGRATIONS = Object.freeze([
  ...LEGACY_SAVE_MIGRATIONS,
  schoolRecordMigration,
  seniorYearMigration,
  tutorialWindowMigration,
  {
    id: 'final-enrollment',
    apply(next) {
      if (!next.pending?.includes('second_registration')) return next;
      return { ...next, pending: next.pending.filter((id) => id !== 'second_registration') };
    },
  },
  {
    id: 'derived-concentration',
    apply(next) {
      if (!next.stats || !Number.isFinite(next.stats.hp) || !Number.isFinite(next.stats.stress))
        return next;
      const focus = concentration(next.stats);
      return next.stats.focus === focus ? next : { ...next, stats: { ...next.stats, focus } };
    },
  },
]);
