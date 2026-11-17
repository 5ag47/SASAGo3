import { assignments, STATS } from '../catalog.js';
import { workTask } from '../tasks.js';
import { CONTENT_VERSION } from '../version.js';

// Keep completed grades and the player's prior GPA. Retire only unfinished removed work.
export function migratePlanner(source) {
  if (!source.created || source.flags?.plannerVersion) return source;
  const next = structuredClone(source);
  const run = next.weekRun;
  for (const [id, task] of Object.entries(next.tasks)) {
    if (task.status !== 'active') continue;
    task.module = { id: task.special === 'contest' ? 'contest_v1' : 'time_v1', params: {} };
    delete task.moduleData;
    delete task.attempts;
    const retired =
      assignments[id]?.enabled === false ||
      /^academy-\d+-2$/.test(id) ||
      /^weekly-clean-/.test(id) ||
      /^union-\d+-[23]$/.test(id);
    if (retired) {
      task.status = 'expired';
      task.retired = true;
      task.result = {
        module: 'time_v1',
        score: null,
        note: '개선판에서 제외된 과제 · 불이익 없음',
      };
    }
  }
  // The current slot's cost was already charged. Finish only its work, once.
  if (run?.waiting?.kind === 'task' && run.slot) {
    const slot = run.slot;
    workTask(next, run.waiting.task, run.messages, slot.amount);
    run.actions.push({
      index: slot.index,
      activity: slot.activity,
      target: slot.target,
      note: slot.note + ' · 시간 투자로 전환',
      delta: Object.fromEntries(
        Object.keys(STATS).map((key) => [
          key,
          Math.round((next.stats[key] - slot.before[key]) * 10) / 10,
        ]),
      ),
      courseDelta: Object.fromEntries(
        Object.entries(next.courseMastery).map(([id, value]) => [
          id,
          Math.round((value - (slot.beforeCourses[id] ?? value)) * 10) / 10,
        ]),
      ),
    });
    run.cursor++;
    run.minHealth = Math.min(run.minHealth, next.stats.hp);
    run.peakStress = Math.max(run.peakStress, next.stats.stress);
    run.slot = null;
    run.waiting = null;
  } else if (run?.waiting?.kind === 'task_result') run.waiting = null;
  next.pending = next.pending.filter((id) => id !== 'club_signup');
  const clean = (slot) =>
    slot.activity === 'club' ||
    (slot.activity === 'task' && next.tasks[slot.target]?.status !== 'active')
      ? { activity: 'sleep', target: null }
      : slot;
  next.plan = next.plan.map(clean);
  if (run) {
    run.plan = run.plan.map((slot, index) => (index < run.cursor ? slot : clean(slot)));
    run.alerts = run.alerts.filter(
      (a) => a.event !== 'club_signup' && (!a.task || next.tasks[a.task]?.status === 'active'),
    );
    if (run.waiting?.event === 'club_signup') run.waiting = null;
  }
  for (const reservations of Object.values(next.flags.reservations ?? {}))
    for (const slot of reservations) if (slot.activity === 'club') slot.activity = 'lecture';
  delete next.flags.club;
  next.flags.plannerVersion = 1;
  next.contentVersion = CONTENT_VERSION;
  return next;
}
