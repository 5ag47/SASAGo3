import { GROUPS } from './catalog.js';
import { applyEffects, random } from './random.js';
import { notice } from './notifications.js';
import { dateOrdinal, weekDate } from './calendar-date.js';
export const gameDay = (state) =>
  dateOrdinal(weekDate(state.week, Math.min(6, Math.floor((state.weekRun?.cursor ?? 0) / 3))));
export function submitStudyApplication(state, group) {
  state.studyApplication = { group, submittedAt: gameDay(state), dueAt: gameDay(state) + 1 };
  state.choices.winter_study = `applied:${group}`;
  state.pending = state.pending.filter((id) => id !== 'winter_study');
  notice(state, '스터디 지원 접수', `${GROUPS[group].name} · 결과는 다음날 도착합니다.`, 'info');
}
export function resolveStudyApplication(state, day = gameDay(state)) {
  const application = state.studyApplication;
  if (!application || day < application.dueAt) return null;
  const group = GROUPS[application.group],
    accepted = random(state) < group.chance;
  if (accepted) {
    state.group = application.group;
    state.choices.winter_study = application.group;
  } else {
    state.rejectedGroups.push(application.group);
    state.choices.winter_study = `rejected:${application.group}`;
    if (!state.pending.includes('winter_study')) state.pending.push('winter_study');
    applyEffects(state, { stress: 2 });
  }
  state.studyApplication = null;
  const result = {
    kind: 'notice',
    title: accepted ? '스터디 합류 확정' : '스터디 지원 결과',
    text: accepted
      ? `${group.name}에 합류했습니다.`
      : `${group.name}에는 합류하지 못했습니다. 다른 모집 팀에 지원할 수 있습니다.`,
  };
  notice(state, result.title, result.text, 'event');
  return result;
}
export function validStudyApplication(value) {
  return (
    value === null ||
    Boolean(
      value &&
      Object.keys(value).length === 3 &&
      Object.hasOwn(GROUPS, value.group) &&
      Number.isInteger(value.submittedAt) &&
      value.submittedAt >= 0 &&
      value.dueAt === value.submittedAt + 1,
    )
  );
}
