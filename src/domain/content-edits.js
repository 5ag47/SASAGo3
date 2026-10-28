const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const own = (object, key) => (Object.hasOwn(object, key) ? object[key] : null);
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    plain(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
export const sameDefinition = (a, b) => canonical(a) === canonical(b);
export function buildRecordPatch(base, edited, catalog) {
  return {
    version: 1,
    ...(catalog ? { catalog } : {}),
    changes: Object.fromEntries(
      Object.entries(edited)
        .filter(([id, record]) => !sameDefinition(own(base, id), record))
        .map(([id, after]) => [id, { before: own(base, id), after: structuredClone(after) }]),
    ),
  };
}
export function applyRecordPatch(current, patch, { validate, catalog, allowLegacy = false }) {
  const conflicts = [],
    issues = [];
  if (
    !plain(current) ||
    !plain(patch) ||
    patch.version !== 1 ||
    !plain(patch.changes) ||
    (patch.catalog !== catalog && !(allowLegacy && patch.catalog === undefined)) ||
    Object.keys(patch).some((key) => !['version', 'catalog', 'changes'].includes(key))
  )
    return { conflicts, issues: ['변경 파일 형식 또는 대상이 올바르지 않습니다.'], next: null };
  const next = structuredClone(current);
  for (const [id, change] of Object.entries(patch.changes)) {
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id) ||
      ['constructor', 'prototype', '__proto__'].includes(id) ||
      !plain(change) ||
      !Object.hasOwn(change, 'before') ||
      !(change.before === null || plain(change.before)) ||
      !plain(change.after) ||
      Object.keys(change).some((key) => !['before', 'after'].includes(key))
    ) {
      issues.push(`${id}: before와 after를 가진 안전한 항목이 필요합니다.`);
      continue;
    }
    if (!sameDefinition(own(current, id), change.before)) {
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
  try {
    issues.push(...validate(next));
  } catch {
    issues.push('전체 콘텐츠를 검사하지 못했습니다.');
  }
  return { conflicts, issues, next: conflicts.length || issues.length ? null : next };
}
