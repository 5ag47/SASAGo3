const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const key = (value) =>
  typeof value === 'string' &&
  /^[a-z][a-z0-9_-]{0,99}$/.test(value) &&
  !['constructor', 'prototype', '__proto__'].includes(value);
const own = (object, name) => (object && Object.hasOwn(object, name) ? object[name] : undefined);
const scalar = (value) =>
  typeof value === 'boolean' ||
  (typeof value === 'string' && value.length <= 100) ||
  (typeof value === 'number' && Number.isFinite(value));

export function conditionIssues(expression, context = {}) {
  const issues = [];
  let count = 0;
  function visit(value, depth) {
    if (++count > 64 || depth > 5 || !plain(value)) {
      issues.push('조건은 깊이 5·노드 64 이내의 객체여야 합니다.');
      return;
    }
    const keys = Object.keys(value);
    if (keys.length === 1 && ['all', 'any'].includes(keys[0])) {
      const list = value[keys[0]];
      if (!Array.isArray(list) || !list.length || list.length > 12) {
        issues.push('all/any에는 1~12개 조건이 필요합니다.');
        return;
      }
      list.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (keys.length === 1 && keys[0] === 'not') {
      visit(value.not, depth + 1);
      return;
    }
    if (value.stat || value.money === true) {
      const allowed = value.stat ? ['stat', 'min', 'max'] : ['money', 'min', 'max'];
      if (
        keys.some((name) => !allowed.includes(name)) ||
        (value.stat &&
          (!key(value.stat) || (context.stats && !Object.hasOwn(context.stats, value.stat)))) ||
        (value.min === undefined && value.max === undefined) ||
        ['min', 'max'].some(
          (name) =>
            value[name] !== undefined &&
            (!Number.isFinite(value[name]) ||
              value[name] < 0 ||
              value[name] > (value.stat ? 100 : 10000000)),
        ) ||
        (value.min !== undefined && value.max !== undefined && value.min > value.max)
      )
        issues.push('능력치/재화 조건의 범위를 확인하세요.');
      return;
    }
    if (value.course || value.major) {
      const field = value.course ? 'course' : 'major',
        catalog = field === 'course' ? context.courses : context.majors;
      if (
        keys.length !== 1 ||
        !key(value[field]) ||
        (catalog && !Object.hasOwn(catalog, value[field]))
      )
        issues.push(`${field}: 등록된 ID가 필요합니다.`);
      return;
    }
    if (value.task) {
      if (
        keys.some((name) => !['task', 'status'].includes(name)) ||
        !key(value.task) ||
        !['active', 'completed', 'expired'].includes(value.status)
      )
        issues.push('과제 ID와 상태를 확인하세요.');
      return;
    }
    if (value.flag || value.choice) {
      const field = value.flag ? 'flag' : 'choice';
      if (
        keys.some((name) => ![field, 'equals'].includes(name)) ||
        !key(value[field]) ||
        !scalar(value.equals)
      )
        issues.push('선택/표식 ID와 비교값을 확인하세요.');
      return;
    }
    issues.push('지원하지 않는 조건입니다.');
  }
  if (expression !== undefined) visit(expression, 0);
  return issues;
}
export function matchesCondition(state, expression) {
  if (expression === undefined) return true;
  if (conditionIssues(expression).length) return false;
  function match(value) {
    if (value.all) return value.all.every(match);
    if (value.any) return value.any.some(match);
    if (value.not) return !match(value.not);
    if (value.stat || value.money) {
      const current = value.stat ? own(state.stats, value.stat) : state.money;
      return (
        Number.isFinite(current) &&
        (value.min === undefined || current >= value.min) &&
        (value.max === undefined || current <= value.max)
      );
    }
    if (value.course) return state.courses.includes(value.course);
    if (value.major) return state.major === value.major;
    if (value.task) return own(state.tasks, value.task)?.status === value.status;
    if (value.flag) return own(state.flags, value.flag) === value.equals;
    return own(state.choices, value.choice) === value.equals;
  }
  return match(expression);
}
export function conditionText(value, labels = {}) {
  if (!value) return '';
  if (conditionIssues(value).length) return '조건 설정 확인 필요';
  if (value.all || value.any)
    return (value.all ?? value.any)
      .map((item) => conditionText(item, labels))
      .join(value.all ? ' · ' : ' 또는 ');
  if (value.not) return `제외 조건: ${conditionText(value.not, labels)}`;
  if (value.stat || value.money)
    return `${value.stat ? (labels.stats?.[value.stat]?.name ?? value.stat) : '용돈'} ${value.min !== undefined ? value.min + ' 이상' : ''}${value.min !== undefined && value.max !== undefined ? ', ' : ''}${value.max !== undefined ? value.max + ' 이하' : ''}`;
  if (value.course) return `${labels.courses?.[value.course]?.name ?? value.course} 수강`;
  if (value.major) return `${labels.majors?.[value.major]?.name ?? value.major} 전공`;
  if (value.task)
    return `${labels.tasks?.[value.task]?.name ?? value.task} ${{ active: '진행 중', completed: '완료', expired: '마감 지남' }[value.status]}`;
  if (value.choice) {
    const event = labels.events?.[value.choice],
      option = event?.options?.find((item) => item.id === value.equals);
    return option ? `${event.name} · ${option.label}` : '이전 선택 필요';
  }
  return '이전 선택 필요';
}
