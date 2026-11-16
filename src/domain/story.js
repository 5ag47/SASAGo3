import chapters from '../../data/chapters.json' with { type: 'json' };
import { notice } from './notifications.js';
export { chapters };
const conditions = {
  thesisComplete: (state) => state.tasks.thesis?.status === 'completed',
  essayComplete: (state) => state.tasks.essay?.status === 'completed',
  anyAdmission: (state) => state.admissions.some((result) => result.accepted),
};
export const STORY_ACTIONS = ['tutorial', 'tasks', 'admissions'];
export function chapterIssues(records) {
  const issues = [];
  for (const [id, chapter] of Object.entries(records)) {
    if (
      !/^[a-z0-9-]+$/.test(id) ||
      !Number.isInteger(chapter.week) ||
      chapter.week < 0 ||
      chapter.week > 41 ||
      !chapter.title ||
      !chapter.location ||
      !STORY_ACTIONS.includes(chapter.action) ||
      !Array.isArray(chapter.pages) ||
      chapter.pages.length < 1 ||
      chapter.pages.length > 12
    ) {
      issues.push(`${id}: invalid chapter`);
      continue;
    }
    for (const page of chapter.pages)
      if (
        typeof page.speaker !== 'string' ||
        typeof page.text !== 'string' ||
        !page.text.length ||
        page.text.length > 500 ||
        (page.when && (!Object.hasOwn(conditions, page.when) || !page.otherwise))
      )
        issues.push(`${id}: invalid page`);
  }
  return issues;
}
export function availableChapters(state) {
  return Object.entries(chapters)
    .filter(([, chapter]) => chapter.week <= state.week)
    .sort((a, b) => a[1].week - b[1].week)
    .map(([id, chapter]) => ({ id, ...chapter }));
}
export function chapterProgress(state, id) {
  return state.story?.[id] ?? { page: 0, read: false };
}
export function chapterText(state, page) {
  return page.when && !conditions[page.when](state) ? page.otherwise : page.text;
}
export function validStory(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([id, progress]) =>
        Object.hasOwn(chapters, id) &&
        progress &&
        Object.keys(progress).length === 2 &&
        typeof progress.read === 'boolean' &&
        Number.isInteger(progress.page) &&
        progress.page >= 0 &&
        progress.page < chapters[id].pages.length &&
        (!progress.read || progress.page === chapters[id].pages.length - 1),
    )
  );
}
export function progressChapter(state, id, action) {
  if (
    !Object.hasOwn(chapters, id) ||
    chapters[id].week > state.week ||
    !['next', 'skip'].includes(action)
  )
    return false;
  const progress = chapterProgress(state, id),
    last = chapters[id].pages.length - 1;
  state.story[id] =
    action === 'skip' || progress.page >= last
      ? { page: last, read: true }
      : { page: progress.page + 1, read: false };
  return true;
}
export function announceChapters(state) {
  for (const chapter of availableChapters(state))
    if (chapter.week === state.week && !state.notices.some((n) => n.chapter === chapter.id))
      notice(state, chapter.title, chapter.location, 'story', { chapter: chapter.id });
}
