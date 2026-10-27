import { courses, activeTasks } from './catalog.js';
import { applyEffects, clamp, random } from './random.js';
import { courseAbility, learnCourse } from './course-progress.js';

export function addTask(state, id, definition) {
  if (state.tasks[id]) return;
  state.tasks[id] = {
    ...definition,
    id,
    description: definition.description ?? '',
    start: state.week,
    progress: 0,
    status: 'active',
  };
}
export function academyTasks(state) {
  if (!state.flags.academy || state.week < 1 || state.week > 16) return;
  const first = 1 + Math.floor((state.week - 1) / 4) * 4;
  for (let i = 1; i <= 2; i++)
    addTask(state, `academy-${first}-${i}`, {
      name: `해냄 심층 숙제 ${i}`,
      description: '월말까지 2칸 투자 · 완료 시 수학·평판 상승',
      target: 2,
      deadline: first + 3,
      reward: { math: 3, reputation: 2 },
      penalty: { math: -2, reputation: -2 },
    });
}
export function finishTask(state, task, messages) {
  task.progress = task.target;
  task.status = 'completed';
  applyEffects(state, task.reward);
  if (task.course) {
    const ability = courseAbility(state, task.course);
    const difficulty = Math.round((random(state) - 0.5) * 8);
    state.assessments.push({
      id: task.id,
      course: task.course,
      kind: 'project',
      score: Math.round(clamp(65 + ability * 0.35 + difficulty)),
      difficulty,
      term: state.week <= 16 ? 1 : 2,
      week: state.week,
    });
  }
  if (task.special === 'contest') {
    const chance = clamp((state.stats.math + state.stats.science) / 180, 0.1, 0.9);
    const won = random(state) < chance;
    if (won) {
      state.awards++;
      applyEffects(state, { reputation: 6, speech: 3 });
    }
    messages.push(won ? '외부대회 수상 · 평판 +6 · 구술력 +3' : '외부대회 준비 완료 · 미수상');
  }
  messages.push(`완료 · ${task.name}`);
}
export function workTask(state, id, messages, progress = 1) {
  const task = state.tasks[id];
  if (!task || task.status !== 'active') return false;
  if (task.course)
    learnCourse(state, task.course, 1, 2 * Math.min(progress, task.target - task.progress));
  task.progress = Math.min(task.target, Math.round((task.progress + progress) * 10) / 10);
  if (task.progress >= task.target) finishTask(state, task, messages);
  return true;
}
export function expireTasks(state, messages) {
  for (const task of activeTasks(state)) {
    if (task.deadline > state.week) continue;
    task.status = 'expired';
    applyEffects(state, task.penalty);
    if (task.course)
      state.assessments.push({
        id: task.id,
        course: task.course,
        kind: 'project',
        score: Math.round((task.progress / task.target) * 55),
        term: state.week <= 16 ? 1 : 2,
        week: state.week,
      });
    messages.push(`마감 · ${task.name} (${task.progress}/${task.target})`);
  }
}
