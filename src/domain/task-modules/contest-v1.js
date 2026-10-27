import time from './time-v1.js';
export default {
  ...time,
  id: 'contest_v1',
  name: '외부대회 준비·수상 판정',
  complete(context) {
    const result = time.complete(context);
    const stats = context.statsAfter(result.effects);
    const chance = Math.max(0.1, Math.min(0.9, (stats.math + stats.science) / 180));
    const won = context.roll() < chance;
    const effects = { ...result.effects };
    if (won) {
      effects.reputation = (effects.reputation ?? 0) + 6;
      effects.speech = (effects.speech ?? 0) + 3;
    }
    return {
      ...result,
      effects,
      awards: Number(won),
      note: won ? '외부대회 수상 · 평판 +6 · 구술력 +3' : '외부대회 준비 완료 · 미수상',
    };
  },
};
