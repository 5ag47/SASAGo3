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
  return locked;
}
export function effectivePlan(state) {
  const locked = lockedSlots(state);
  return state.plan.map((slot, index) => locked[index] ?? slot);
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
