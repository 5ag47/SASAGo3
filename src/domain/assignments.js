import { moduleIssues, moduleSignature, defaultTaskGame } from './task-modules/registry.js';
export const TASK_FORMATS = {
  custom: '일반',
  report: '보고서',
  presentation: '발표',
  problem_set: '문제 만들기·풀이',
  archive: '아카이빙',
  project: '프로젝트',
};
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const shortText = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const idPattern = /^[a-z][a-z0-9_-]{1,79}$/;
export function validTaskStages(task) {
  return (
    task.stages === undefined ||
    (Array.isArray(task.stages) &&
      task.stages.length > 0 &&
      task.stages.length <= 12 &&
      new Set(task.stages.map((stage) => stage?.id)).size === task.stages.length &&
      task.stages.every(
        (stage) =>
          plain(stage) &&
          idPattern.test(stage.id) &&
          shortText(stage.name, 80) &&
          Number.isFinite(stage.target) &&
          stage.target > 0 &&
          stage.target <= 100,
      ) &&
      Math.abs(task.stages.reduce((sum, stage) => sum + stage.target, 0) - task.target) < 0.000001)
  );
}
export function assignmentIssues(definitions, { courses, stats }) {
  const issues = [];
  if (!plain(definitions)) return ['루트: 과제 ID를 키로 갖는 객체여야 합니다.'];
  const groups = Object.entries(definitions).filter(
    ([, definition]) => definition?.kind === 'group',
  );
  const allowed = [
    'kind',
    'name',
    'description',
    'week',
    'deadline',
    'day',
    'deadlineDay',
    'course',
    'target',
    'reward',
    'penalty',
    'special',
    'format',
    'stages',
    'repeat',
    'enabled',
    'module',
  ];
  for (const [id, task] of Object.entries(definitions)) {
    const error = (field, message) => issues.push(`${id}.${field}: ${message}`);
    if (!idPattern.test(id))
      error('id', '영문 소문자로 시작하는 2~80자의 영문·숫자·밑줄·하이픈을 사용하세요.');
    if (!plain(task)) {
      error('정의', '객체여야 합니다.');
      continue;
    }
    if (task.kind === 'group') {
      if (
        Object.keys(task).some(
          (key) => !['kind', 'name', 'members', 'module', 'enabled'].includes(key),
        )
      )
        error('그룹', '지원하지 않는 필드입니다.');
      if (!shortText(task.name, 100)) error('name', '그룹 이름이 필요합니다.');
      if (
        !Array.isArray(task.members) ||
        !task.members.length ||
        task.members.length > 400 ||
        new Set(task.members).size !== task.members.length ||
        task.members.some(
          (member) => !Object.hasOwn(definitions, member) || definitions[member]?.kind !== 'task',
        )
      )
        error('members', '존재하는 과제 ID를 중복 없이 선택하세요.');
      if (task.module === undefined) error('module', '그룹에 연결할 모듈을 지정하세요.');
      for (const issue of moduleIssues(task.module)) error('module', issue);
      if (task.enabled !== undefined && typeof task.enabled !== 'boolean')
        error('enabled', 'true 또는 false여야 합니다.');
      continue;
    }
    for (const key of Object.keys(task))
      if (!allowed.includes(key)) error(key, '지원하지 않는 필드입니다.');
    if (task.kind !== 'task') error('kind', 'task여야 합니다.');
    for (const issue of moduleIssues(task.module)) error('module', issue);
    const inherited = groups.filter(
      ([, group]) =>
        group.enabled !== false && Array.isArray(group.members) && group.members.includes(id),
    );
    if (
      !task.module &&
      new Set(inherited.map(([, group]) => moduleSignature(group.module))).size > 1
    )
      error(
        'module',
        '그룹 모듈 설정이 충돌합니다. 과제에 모듈을 직접 지정하거나 그룹을 조정하세요.',
      );
    if (!shortText(task.name, 100)) error('name', '1~100자의 과제 이름이 필요합니다.');
    if (typeof task.description !== 'string' || task.description.length > 1000)
      error('description', '설명은 1,000자 이내 문자열이어야 합니다.');
    if (!integer(task.week, 0, 40)) error('week', '발생 주는 0~40의 정수입니다.');
    for (const field of ['day', 'deadlineDay'])
      if (task[field] !== undefined && !integer(task[field], 0, 6))
        error(field, '요일은 월요일 0~일요일 6입니다.');
    if (!integer(task.deadline, task.week, 40))
      error('deadline', '발생 주 이후, 40주 이내로 지정하세요.');
    if (!Number.isFinite(task.target) || task.target <= 0 || task.target > 100)
      error('target', '분량은 0 초과 100 이하입니다.');
    if (task.course !== undefined && !Object.hasOwn(courses, task.course))
      error('course', '존재하는 과목 ID를 선택하세요.');
    if (task.format !== undefined && !Object.hasOwn(TASK_FORMATS, task.format))
      error('format', '지원하는 표시 유형을 선택하세요.');
    if (task.enabled !== undefined && typeof task.enabled !== 'boolean')
      error('enabled', 'true 또는 false여야 합니다.');
    if (
      task.special !== undefined &&
      !['research', 'essay', 'application', 'clean', 'tutorial', 'contest'].includes(task.special)
    )
      error('special', '지원하지 않는 연결 활동입니다.');
    for (const field of ['reward', 'penalty']) {
      if (task[field] === undefined) continue;
      if (!plain(task[field])) {
        error(field, '능력치 ID와 변화량의 객체여야 합니다.');
        continue;
      }
      for (const [key, value] of Object.entries(task[field]))
        if (!Object.hasOwn(stats, key) || !Number.isFinite(value) || Math.abs(value) > 100)
          error(`${field}.${key}`, '유효한 능력치와 -100~100 변화량만 사용할 수 있습니다.');
    }
    if (!validTaskStages(task))
      error(
        'stages',
        '단계 ID·이름·분량을 확인하세요. 단계 분량의 합이 전체 분량과 같아야 합니다.',
      );
    if (task.repeat !== undefined) {
      if (
        !plain(task.repeat) ||
        Object.keys(task.repeat).some((key) => !['every', 'until'].includes(key)) ||
        !integer(task.repeat.every, 1, 40) ||
        !integer(task.repeat.until, task.week, 40)
      )
        error('repeat', '반복 간격은 1~40, 종료 주는 발생 주~40입니다.');
      else {
        const last =
          task.week +
          Math.floor((task.repeat.until - task.week) / task.repeat.every) * task.repeat.every;
        if (last + task.deadline - task.week > 40)
          error('repeat', '마지막 반복의 마감이 40주를 넘습니다.');
      }
    }
  }
  return issues;
}
export function expandAssignments(definitions) {
  const result = Object.create(null);
  const groups = Object.values(definitions ?? {}).filter(
    (definition) => definition?.kind === 'group' && definition.enabled !== false,
  );
  for (const [id, definition] of Object.entries(definitions ?? {})) {
    if (
      !plain(definition) ||
      definition.kind !== 'task' ||
      definition.enabled === false ||
      !integer(definition.week, 0, 40)
    )
      continue;
    const starts = [definition.week];
    if (
      integer(definition.repeat?.every, 1, 40) &&
      integer(definition.repeat?.until, definition.week, 40)
    )
      for (
        let week = definition.week + definition.repeat.every;
        week <= definition.repeat.until;
        week += definition.repeat.every
      )
        starts.push(week);
    for (const week of starts) {
      const instance = week === definition.week ? id : `${id}--w${week}`;
      if (Object.hasOwn(result, instance)) throw new Error(`DUPLICATE_ASSIGNMENT_ID:${instance}`);
      const { repeat, enabled, ...task } = definition;
      const inherited = groups.find(
        (group) => Array.isArray(group.members) && group.members.includes(id),
      )?.module;
      result[instance] = {
        ...task,
        module: structuredClone(definition.module ?? inherited ?? defaultTaskGame(task)),
        week,
        deadline: week + definition.deadline - definition.week,
      };
    }
  }
  return result;
}
export function taskStages(task) {
  let offset = 0;
  return (task.stages ?? []).map((stage) => {
    const progress = Math.min(stage.target, Math.max(0, task.progress - offset));
    const status =
      progress >= stage.target ? 'completed' : task.progress >= offset ? 'active' : 'waiting';
    offset += stage.target;
    return { ...stage, progress: Math.round(progress * 10) / 10, status };
  });
}
