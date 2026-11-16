import { validCardGame } from './card-game.js';
import { validInterview } from './interview.js';

export const emptyMinigames = () => ({ cards: null, interview: null });
export function validMinigames(games) {
  return Boolean(
    games &&
    typeof games === 'object' &&
    !Array.isArray(games) &&
    Object.keys(games).length === 2 &&
    validCardGame(games.cards) &&
    validInterview(games.interview),
  );
}
export function abandonMinigame(state, event) {
  if (event === 'dorm_cards' && ['play', 'decision'].includes(state.minigames.cards?.phase)) {
    state.minigames.cards.phase = 'abandoned';
    state.minigames.cards.reason = 'deadline';
  }
  if (event === 'interview_day' && state.minigames.interview?.phase === 'active')
    state.minigames.interview.phase = 'abandoned';
}
