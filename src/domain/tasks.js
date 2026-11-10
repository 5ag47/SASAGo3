import { courses, activeTasks } from './catalog.js';
import { applyEffects } from './random.js';
import { learnCourse } from './course-progress.js';
import { notice } from './notifications.js';
import { taskModuleSpec, taskModule, defaultTaskGame } from './task-modules/registry.js';
import { processTaskWork, resolveTaskOutcome, taskIsComplete } from './task-processing.js';
import { calendarTiming } from './calendar-date.js';
import { refreshDocuments } from './admission-documents.js';

export function addTask(state, id, definition) {
  if (state.tasks[id]) return;
  const deadline = calendarTiming(
    'deadline:' + id,
    definition.deadline,
    definition.deadlineDay ?? 6,
  );
  state.tasks[id] = {
    ...structuredClone(definition),
    deadline: deadline.week,
    deadlineDay: deadline.day,
    module: structuredClone(definition.module ?? defaultTaskGame(definition)),
    id,
    description: definition.description ?? '',
    start: state.week,
    progress: 0,
    status: 'active',
  };
  if (definition.special !== 'tutorial')
    notice(
      state,
      definition.name,
      `${definition.target}${taskModule(state.tasks[id]).unit} · ${deadline.week === state.week ? '이번 주 마감' : `${deadline.week - state.week}주 뒤 마감`}`,
      'task',
      { task: id },
    );
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
  if (task.status !== 'active') return;
  const result = resolveTaskOutcome(state, task, true);
  task.progress = task.target;
  task.status = 'completed';
  task.completedWeek = state.week;
  task.result = {
    module: task.module?.id ?? taskModuleSpec(task).id,
    score: result.score,
    note: result.note ?? '',
    quality: task.attempts?.successful
      ? Math.round(task.attempts.qualitySum / task.attempts.successful)
      : (task.moduleData?.quality ?? null),
  };
  applyEffects(state, result.effects);
  state.awards += result.awards ?? 0;
  if (task.course && result.score !== null) {
    state.assessments.push({
      id: task.id,
      course: task.course,
      kind: 'project',
      score: result.score,
      ...(result.difficulty !== undefined ? { difficulty: result.difficulty } : {}),
      term: state.week <= 16 ? 1 : 2,
      week: state.week,
    });
  }
  if (result.note) messages.push(result.note);
  const nextStage = {
    essay_draft: ['essay-rewrite', '자소서 뜯어고치기', 'essay_rewrite'],
    essay_rewrite: ['essay-feedback', '최종 피드백 반영하기', 'essay_feedback'],
  }[task.special];
  if (nextStage)
    addTask(state, nextStage[0], {
      name: nextStage[1],
      description: '이전 단계를 마쳤습니다. 자습을 배정해 다음 단계를 진행하세요.',
      target: 2,
      deadline: 28,
      special: nextStage[2],
      module: { id: 'time_v1', params: {} },
      reward: { writing: 3 },
      penalty: { reputation: -3, stress: 5 },
    });
  if (task.special === 'essay_feedback' && state.tasks.essay?.status === 'active')
    finishTask(state, state.tasks.essay, messages);
  refreshDocuments(state);
  messages.push(`완료 · ${task.name}`);
}
export function workTask(state, id, messages, progress = 1) {
  const task = state.tasks[id];
  if (!task || task.status !== 'active') return false;
  const gained = processTaskWork(state, task, progress);
  if (task.course)
    learnCourse(state, task.course, 1, 2 * Math.min(gained, task.target - task.progress));
  task.progress = Math.min(task.target, Math.round((task.progress + gained) * 1000) / 1000);
  if (taskIsComplete(state, task)) finishTask(state, task, messages);
  return true;
}
export function expireTasks(state, messages, day = 6) {
  for (const task of activeTasks(state)) {
    if (
      task.deadline > state.week ||
      (task.deadline === state.week && (task.deadlineDay ?? 6) > day)
    )
      continue;
    const result = resolveTaskOutcome(state, task, false);
    task.status = 'expired';
    task.result = { module: taskModuleSpec(task).id, score: result.score, note: result.note ?? '' };
    applyEffects(state, result.effects);
    state.awards += result.awards ?? 0;
    if (result.note) messages.push(result.note);
    if (task.course && result.score !== null)
      state.assessments.push({
        id: task.id,
        course: task.course,
        kind: 'project',
        score: result.score,
        term: state.week <= 16 ? 1 : 2,
        week: state.week,
      });
    messages.push(`마감 · ${task.name} (${task.progress}/${task.target})`);
  }
}
