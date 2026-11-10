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
export function taskCommandSummary(state, command) {
  const task = command.type === 'task_game' ? state.tasks[command.task] : null;
  return task
    ? {
        id: task.id,
        module: task.module?.id,
        progress: task.progress,
        phase: task.moduleData?.phase ?? 'unstarted',
        quality: task.moduleData?.quality ?? null,
        status: task.status,
        attempt: task.attempts?.total ?? 0,
        sequence: task.attempts?.sequence ?? 0,
      }
    : null;
}
export function progressSummary(state) {
  return {
    direction: state.flags.target,
    dayCursor: state.weekRun?.cursor ?? null,
    recommendation: state.recommendation
      ? {
          teacher: state.recommendation.teacher,
          status: state.recommendation.status,
          progress: state.recommendation.progress,
          target: state.recommendation.target,
        }
      : null,
    submittedWeek: state.documents?.week ?? null,
  };
}
