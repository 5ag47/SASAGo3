import { assignmentIssues, expandAssignments } from './assignments.js';
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    plain(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
export const sameDefinition = (a, b) => canonical(a) === canonical(b);
export function buildAssignmentPatch(base, edited) {
  return {
    version: 1,
    changes: Object.fromEntries(
      Object.entries(edited)
        .filter(([id, definition]) => !sameDefinition(base[id], definition))
        .map(([id, after]) => [id, { before: base[id] ?? null, after: structuredClone(after) }]),
    ),
  };
}
export function applyAssignmentPatch(current, patch, context) {
  const conflicts = [],
    issues = [];
  if (
    !plain(patch) ||
    patch.version !== 1 ||
    !plain(patch.changes) ||
    Object.keys(patch).some((key) => !['version', 'changes'].includes(key))
  )
    return { conflicts, issues: ['변경 파일 형식이 올바르지 않습니다.'], next: null };
  const next = structuredClone(current);
  for (const [id, change] of Object.entries(patch.changes)) {
    if (
      !plain(change) ||
      !Object.hasOwn(change, 'before') ||
      !plain(change.after) ||
      Object.keys(change).some((key) => !['before', 'after'].includes(key))
    ) {
      issues.push(`${id}: before와 after가 필요합니다.`);
      continue;
    }
    if (!sameDefinition(Object.hasOwn(current, id) ? current[id] : null, change.before)) {
      conflicts.push(id);
      continue;
    }
    Object.defineProperty(next, id, {
      value: structuredClone(change.after),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  issues.push(...assignmentIssues(next, context));
  try {
    const expanded = expandAssignments(next);
    if (Object.keys(expanded).length > 400)
      issues.push('반복을 포함한 과제는 400개 이내로 유지하세요.');
    for (const id of Object.keys(expanded))
      if (context.reservedIds?.includes(id))
        issues.push(`${id}: 다른 이벤트가 이미 사용하는 ID입니다.`);
  } catch (error) {
    issues.push(error.message);
  }
  return { conflicts, issues, next: conflicts.length || issues.length ? null : next };
}
