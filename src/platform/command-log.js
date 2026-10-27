export function minigameSummary(state) {
  const { cards, interview } = state.minigames;
  return {
    cards: cards
      ? {
          phase: cards.phase,
          turn: cards.turn,
          mine: cards.mine.length / 2,
          friend: cards.friend.length / 2,
          go: cards.go,
          result: cards.result,
        }
      : null,
    interview: interview
      ? { phase: interview.phase, answered: interview.answers.length, score: interview.score }
      : null,
  };
}
export function scheduleChanges(before, after) {
  return after.plan.flatMap((slot, index) => {
    const previous = before.plan[index];
    return previous && (previous.activity !== slot.activity || previous.target !== slot.target)
      ? [{ index, before: { ...previous }, after: { ...slot } }]
      : [];
  });
}
