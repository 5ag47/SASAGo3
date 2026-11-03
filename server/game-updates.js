import { publicTasks } from '../src/domain/task-processing.js';
export const publicWeekRun = (run) => (run ? { ...run, seedBefore: 0 } : null);
export function taskDelta(before, next, taskId) {
  return {
    kind: 'task-v1',
    baseRevision: before.revision,
    revision: next.revision,
    contentVersion: next.contentVersion,
    task: publicTasks({ [taskId]: next.tasks[taskId] })[taskId],
    stats: next.stats,
    courseMastery: next.courseMastery,
    awards: next.awards,
    assessments: next.assessments.slice(before.assessments.length),
    weekRun: publicWeekRun(next.weekRun),
    documents: next.documents,
  };
}
