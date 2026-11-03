export function lockedSlots(state) {
  const locked = {};
  if (state.week >= 18 && state.week <= 24) {
    const count = state.flags.camp === 'heavy' ? 3 : state.flags.camp === 'light' ? 1 : 0;
    for (let i = 0; i < count; i++) locked[i * 3 + 1] = { activity: 'academy', target: null };
    if (state.flags.scienceCamp)
      for (const index of [10, 13]) locked[index] = { activity: 'science_academy', target: null };
  }
  if (state.week === 9 && state.flags.festival) {
    locked[0] = { activity: 'lecture', target: null };
    locked[1] = { activity: 'lecture', target: null };
  }
  for (const reservation of state.flags.reservations?.[state.week] ?? [])
    locked[reservation.index] = {
      activity: reservation.activity,
      target: reservation.target ?? null,
    };
  if (state.weekRun) {
    const count = state.weekRun.cursor + Number(state.weekRun.waiting?.kind === 'task');
    for (let index = 0; index < count; index++) locked[index] = { ...state.weekRun.plan[index] };
  }
  return locked;
}
export function effectivePlan(state) {
  const locked = lockedSlots(state);
  return state.plan.map((slot, index) => locked[index] ?? slot);
}
export function copyDayPreview(state, sourceDay, days) {
  const locked = lockedSlots(state);
  return days.map((day) => ({
    day,
    indices: [0, 1, 2]
      .filter((session) => !locked[sourceDay * 3 + session] && !locked[day * 3 + session])
      .map((session) => day * 3 + session),
  }));
}
export function copyDayPlan(state, sourceDay, days) {
  const next = state.plan.map((slot) => ({ ...slot }));
  for (const { indices } of copyDayPreview(state, sourceDay, days))
    for (const index of indices) next[index] = { ...state.plan[sourceDay * 3 + (index % 3)] };
  return next;
}
export function reserveActivities(state, reservation, event) {
  const locked = lockedSlots(state);
  const free = Array.from({ length: 21 }, (_, index) => index).filter((index) => !locked[index]);
  if (free.length < reservation.count) throw new Error('EVENT_RESERVATION_CAPACITY');
  state.flags.reservations ??= {};
  const current = state.flags.reservations[state.week] ?? [];
  state.flags.reservations[state.week] = [
    ...current,
    ...free
      .slice(0, reservation.count)
      .map((index) => ({ index, activity: reservation.activity, target: null, event })),
  ];
}
