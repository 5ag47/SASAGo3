// Task modules receive a frozen, narrow context. A task input cannot edit history,
// other tasks, story or choices, so those immutable records can be shared safely.
export function copyForTaskInput(source, taskId) {
  return {
    ...source,
    stats: { ...source.stats },
    courseMastery: { ...source.courseMastery },
    tasks: { ...source.tasks, [taskId]: structuredClone(source.tasks[taskId]) },
    weekRun: source.weekRun ? structuredClone(source.weekRun) : null,
    assessments: [...source.assessments],
  };
}
