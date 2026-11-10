const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
export function admissionIssues(definitions, { events, stats, thresholds }) {
  const issues = [],
    routes = Object.entries(definitions).filter(([, item]) => item.kind === 'route');
  const factors = ['gpa', 'record', 'fit', 'essay', 'recommendation', 'interview'];
  function weights(value, keys, label) {
    if (
      !plain(value) ||
      Object.keys(value).length !== keys.length ||
      keys.some((key) => !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1) ||
      Math.abs(Object.values(value ?? {}).reduce((sum, amount) => sum + amount, 0) - 1) > 0.00001
    )
      issues.push(`${label}: 가중치 항목과 합계 1을 확인하세요.`);
  }
  weights(
    definitions.school_record?.weights,
    ['coursework', 'exploration', 'participation', 'continuity'],
    'school_record',
  );
  weights(
    definitions.essay_support?.weights,
    ['execution', 'record', 'teacher', 'writing'],
    'essay_support',
  );
  for (const [id, item] of routes) {
    weights(item.weights, factors, id);
    if (
      !Object.values(events).some((event) => event.profile === id) ||
      !Number.isFinite(thresholds[id])
    )
      issues.push(`${id}: 전형 이벤트와 합격 기준 연결이 필요합니다.`);
    if ((item.weights.gpa ?? 0) + (item.weights.record ?? 0) < 0.6)
      issues.push(`${id}: 학점과 학교생활기록이 중심이어야 합니다.`);
    if (typeof item.externalAwards !== 'boolean')
      issues.push(`${id}: externalAwards가 필요합니다.`);
  }
  for (const [id, item] of Object.entries(definitions)) {
    if (!['record', 'essay', 'route', 'direction', 'recommendation'].includes(item.kind))
      issues.push(`${id}: 알 수 없는 종류입니다.`);
    if (
      item.kind === 'direction' &&
      (!['dream', 'balanced', 'safe'].includes(item.id) ||
        !item.name ||
        !Array.isArray(item.routes) ||
        !item.routes.length ||
        new Set(item.routes).size !== item.routes.length ||
        item.routes.some((route) => !routes.some(([key]) => key === route)))
    )
      issues.push(`${id}: 지원 방향의 전형 목록을 확인하세요.`);
  }
  for (const key of [
    'courseSamples',
    'explorationSamples',
    'communitySlots',
    'thesisCredit',
    'disciplinePenalty',
  ])
    if (
      !Number.isFinite(definitions.school_record?.[key]) ||
      definitions.school_record[key] <= 0 ||
      definitions.school_record[key] > 100
    )
      issues.push(`school_record.${key}: 0 초과 100 이하가 필요합니다.`);
  if (
    !Number.isFinite(definitions.school_record?.generalCourseCredit) ||
    definitions.school_record.generalCourseCredit <= 0 ||
    definitions.school_record.generalCourseCredit > 1
  )
    issues.push('school_record.generalCourseCredit: 0 초과 1 이하가 필요합니다.');
  const essay = definitions.essay_support;
  if (
    !essay ||
    !Number.isFinite(essay.reputationStart) ||
    essay.reputationStart < 0 ||
    essay.reputationStart > 100 ||
    !Number.isFinite(essay.reputationSpan) ||
    essay.reputationSpan < 1 ||
    essay.reputationSpan > 100 ||
    ['reputationBonus', 'teacherProgressBonus'].some(
      (key) => !Number.isFinite(essay[key]) || essay[key] < 0 || essay[key] > 1,
    ) ||
    ['hp', 'focus', 'stress'].some(
      (key) =>
        !Number.isFinite(essay.burden?.[key]) || essay.burden[key] < 0 || essay.burden[key] > 5,
    ) ||
    !Number.isFinite(essay.progressCap) ||
    essay.progressCap < 1 ||
    essay.progressCap > 2
  )
    issues.push('essay_support: 상담 효과 범위를 확인하세요.');
  const recommendation = definitions.recommendation_support;
  if (
    !recommendation ||
    !Number.isInteger(recommendation.sessions) ||
    recommendation.sessions < 1 ||
    recommendation.sessions > 5 ||
    ['healthCost', 'focusCost', 'stressCost'].some(
      (key) =>
        !Number.isFinite(recommendation[key]) || recommendation[key] < 0 || recommendation[key] > 5,
    )
  )
    issues.push('recommendation_support: 자료 확인 설정을 확인하세요.');
  if (!Object.hasOwn(stats, 'writing')) issues.push('서술력 스탯이 필요합니다.');
  return issues;
}
