export function notice(state, title, text, kind = 'info', link = {}) {
  state.flags.noticeSequence = (state.flags.noticeSequence ?? 0) + 1;
  state.notices.unshift({
    id: `notice-${state.flags.noticeSequence}`,
    week: state.week,
    title,
    text,
    kind,
    ...link,
  });
  state.notices = state.notices.slice(0, 120);
}
