import time from './time-v1.js';
import contest from './contest-v1.js';
export function puzzleModule({ id, name, game }) {
  return {
    ...time,
    id,
    name,
    game,
    work(context) {
      return { progress: context.task.moduleData?.passed ? context.amount : 0 };
    },
    isComplete(context) {
      return context.task.moduleData?.passed === true && time.isComplete(context);
    },
    complete(context) {
      const result = (context.task.special === 'contest' ? contest : time).complete(context);
      return {
        ...result,
        note: [`미니게임 ${context.task.moduleData?.quality ?? 0}점`, result.note]
          .filter(Boolean)
          .join(' · '),
      };
    },
  };
}
export function drawUnique(roll, size, count) {
  const pool = Array.from({ length: size }, (_, index) => index);
  return Array.from({ length: count }, () => pool.splice(Math.floor(roll() * pool.length), 1)[0]);
}
export const quality = (mistakes) => Math.max(60, 100 - mistakes * 10);
export const validMistakes = (value) => Number.isInteger(value) && value >= 0 && value <= 1000;
