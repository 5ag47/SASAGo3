import { COURSES } from '../data/courses.js';
export function enrollCourse(game, major) {
  if (game.enrolled || game.ended || !COURSES.includes(major)) return game;
  return { ...game, major, enrolled: true, tutorialStep: Math.max(2, game.tutorialStep) };
}
