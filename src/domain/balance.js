import balance from '../../data/balance.json' with { type: 'json' };
export { balance };
export const ACADEMIC_STATS = ['math', 'science', 'writing', 'speech'];
export function positiveGrowth(stat, value) {
  const config = balance.growth;
  if (ACADEMIC_STATS.includes(stat))
    return (
      config.academicRate *
      Math.max(config.academicFloor, 1 - (value / 100) ** config.academicPower)
    );
  if (['reputation', 'charm'].includes(stat))
    return config.socialRate * Math.max(config.socialFloor, 1 - value / config.socialScale);
  return 1;
}
