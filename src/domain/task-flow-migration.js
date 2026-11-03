import { finishTask } from './tasks.js';
import { events } from './catalog.js';
export function upgradeTaskFlow(source) {
  const next = structuredClone(source);
  next.flags.taskFlowVersion = 2;
  next.flags.eventDeliveries = Object.fromEntries(
    Object.entries(events)
      .filter(([, event]) => event.week <= next.week)
      .map(([id]) => [id, true]),
  );
  for (const task of Object.values(next.tasks)) {
    if (task.status !== 'active') continue;
    // A verified puzzle completed under the old flow is already finished work.
    if (task.moduleData?.passed) {
      finishTask(next, task, []);
      continue;
    }
    if (task.special === 'tutorial') {
      task.module = { id: 'time_v1', params: {} };
      delete task.moduleData;
      continue;
    }
    if (['order_v1', 'pattern_v1'].includes(task.module?.id))
      task.module = { ...task.module, id: task.module.id.replace('_v1', '_v2') };
  }
  return next;
}
