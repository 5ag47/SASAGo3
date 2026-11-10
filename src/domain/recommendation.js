import { TEACHERS } from './catalog.js';
import { schoolRecord, admissionDefinitions } from './school-record.js';
import { applyEffects } from './random.js';
import { gameDay } from './study-applications.js';
import { refreshDocuments } from './admission-documents.js';
import { notice } from './notifications.js';
export function startRecommendation(state, teacher) {
  state.recommendation = {
    teacher,
    status: 'preparing',
    progress: 0,
    target: admissionDefinitions.recommendation_support.sessions,
    quality: null,
    dueAt: null,
  };
}
export function recommendationBurden(state, teacher) {
  return 0.7 * (1 - schoolRecord(state).score / 100) + 0.3 * (1 - state.teachers[teacher] / 100);
}
export function advanceRecommendation(state, teacher) {
  const review = state.recommendation;
  if (!review || review.status !== 'preparing' || review.teacher !== teacher) return '';
  const config = admissionDefinitions.recommendation_support;
  const burden = recommendationBurden(state, teacher);
  applyEffects(state, {
    hp: -config.healthCost * burden,
    stress: config.stressCost * burden,
  });
  review.progress = Math.min(review.target, review.progress + 1);
  if (review.progress >= review.target) {
    review.status = 'reviewing';
    review.dueAt = gameDay(state) + 1;
    review.quality = Math.round(schoolRecord(state).score * 0.6 + state.teachers[teacher] * 0.4);
  }
  return `자료 확인 ${review.progress}/${review.target}`;
}
export function resolveRecommendation(state, day) {
  const review = state.recommendation;
  if (!review || review.status !== 'reviewing' || day < review.dueAt) return null;
  review.status = 'ready';
  refreshDocuments(state);
  const result = {
    kind: 'notice',
    title: '추천서 준비 완료',
    text: `${TEACHERS[review.teacher]} 선생님과 자료 확인을 마쳤습니다.`,
  };
  notice(state, result.title, result.text, 'event');
  return result;
}
export function validRecommendation(value) {
  if (value === null) return true;
  const sessions = value?.target;
  return Boolean(
    value &&
    Number.isInteger(sessions) &&
    sessions >= 1 &&
    sessions <= 5 &&
    Object.hasOwn(TEACHERS, value.teacher) &&
    ['preparing', 'reviewing', 'ready'].includes(value.status) &&
    Number.isInteger(value.progress) &&
    value.progress >= 0 &&
    value.progress <= sessions &&
    (value.status === 'preparing'
      ? value.progress < sessions && value.quality === null && value.dueAt === null
      : value.progress === sessions &&
        Number.isFinite(value.quality) &&
        value.quality >= 0 &&
        value.quality <= 100 &&
        Number.isInteger(value.dueAt) &&
        value.dueAt >= 0),
  );
}
