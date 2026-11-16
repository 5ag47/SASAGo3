import { GameError } from '../domain/engine.js';
import { CONTENT_VERSION } from '../domain/state.js';
import { validDocuments } from '../domain/admission-documents.js';
export function applyServerUpdate(source, body, taskId) {
  if (body.state) return body.state;
  const delta = body.delta;
  if (
    !delta ||
    delta.kind !== 'task-v1' ||
    delta.baseRevision !== source.revision ||
    delta.revision !== source.revision + 1 ||
    delta.contentVersion !== CONTENT_VERSION ||
    delta.task?.id !== taskId ||
    !Object.hasOwn(source.tasks, taskId) ||
    !Array.isArray(delta.assessments) ||
    delta.assessments.length > 1 ||
    !validDocuments(delta.documents) ||
    !delta.stats ||
    !delta.courseMastery
  )
    throw Object.assign(
      new GameError(
        'RESPONSE_INVALID',
        '저장 응답의 버전이 일치하지 않습니다. 최신 기록을 확인해 주세요.',
      ),
      { outcomeUnknown: true },
    );
  return {
    ...source,
    revision: delta.revision,
    contentVersion: delta.contentVersion,
    seed: 0,
    tasks: { ...source.tasks, [taskId]: delta.task },
    stats: delta.stats,
    courseMastery: delta.courseMastery,
    awards: delta.awards,
    assessments: [...source.assessments, ...delta.assessments],
    weekRun: delta.weekRun,
    documents: delta.documents,
  };
}
