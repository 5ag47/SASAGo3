import { assignmentIssues, expandAssignments } from './assignments.js';
import { buildRecordPatch, applyRecordPatch } from './content-edits.js';
export { sameDefinition } from './content-edits.js';
export const buildAssignmentPatch = (base, edited) => buildRecordPatch(base, edited);
export function validateAssignments(definitions, context) {
  const issues = assignmentIssues(definitions, context);
  try {
    const expanded = expandAssignments(definitions);
    if (Object.keys(expanded).length > 400)
      issues.push('반복을 포함한 과제는 400개 이내로 유지하세요.');
    for (const id of Object.keys(expanded))
      if (context.reservedIds?.includes(id))
        issues.push(`${id}: 다른 이벤트가 이미 사용하는 ID입니다.`);
  } catch (error) {
    issues.push(error.message);
  }
  return issues;
}
export const applyAssignmentPatch = (current, patch, context) =>
  applyRecordPatch(current, patch, {
    catalog: 'assignments',
    allowLegacy: true,
    validate: (next) => validateAssignments(next, context),
  });
