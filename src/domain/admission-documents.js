import { gpa } from './academic-grades.js';
import { schoolRecord, majorFit } from './school-record.js';
export function currentDocumentFactors(state) {
  return {
    gpa: ((gpa(state) * 0.8 + state.campaign.priorGpa * 0.2) / 4.3) * 100,
    record: schoolRecord(state).score,
    fit: majorFit(state),
    essay:
      state.tasks.essay?.status === 'completed' ? (state.tasks.essay.result?.quality ?? 75) : 0,
    recommendation: state.recommendation?.status === 'ready' ? state.recommendation.quality : 0,
  };
}
export function refreshDocuments(state) {
  if (
    state.documents ||
    !['dream', 'balanced', 'safe'].includes(state.choices.applications) ||
    state.tasks.application_form?.status !== 'completed' ||
    state.tasks.essay?.status !== 'completed' ||
    (state.flags.recommender && state.recommendation?.status !== 'ready')
  )
    return;
  const record = schoolRecord(state);
  state.documents = {
    week: state.week,
    direction: state.flags.target,
    factors: currentDocumentFactors(state),
    recordScores: record.scores,
    recordCounts: {
      coursework: record.completed,
      exploration: record.explorationCount,
      community: record.community,
      activeWeeks: record.activeWeeks,
    },
  };
}
export function validDocuments(value) {
  return (
    value === null ||
    Boolean(
      value &&
      Number.isInteger(value.week) &&
      value.week >= 0 &&
      value.week <= 40 &&
      ['dream', 'balanced', 'safe'].includes(value.direction) &&
      value.factors &&
      value.recordScores &&
      (value.recordCounts === undefined ||
        ['coursework', 'exploration', 'community', 'activeWeeks'].every(
          (id) =>
            Number.isInteger(value.recordCounts?.[id]) &&
            value.recordCounts[id] >= 0 &&
            value.recordCounts[id] <= 5000,
        )) &&
      ['gpa', 'record', 'fit', 'essay', 'recommendation'].every(
        (id) =>
          Number.isFinite(value.factors[id]) && value.factors[id] >= 0 && value.factors[id] <= 100,
      ) &&
      ['coursework', 'exploration', 'participation', 'continuity'].every(
        (id) =>
          Number.isFinite(value.recordScores[id]) &&
          value.recordScores[id] >= 0 &&
          value.recordScores[id] <= 100,
      ),
    )
  );
}
