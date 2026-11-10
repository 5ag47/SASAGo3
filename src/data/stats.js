export const STATS = [
  { key: 'hp', label: '건강', color: '#7ba58a' },
  { key: 'focus', label: '집중력', color: '#d4ad65' },
  { key: 'reputation', label: '평판', color: '#a68bb6' },
  { key: 'stress', label: '스트레스', color: '#d1887e' },
  { key: 'math', label: '수학', color: '#799fc6' },
  { key: 'science', label: '물리', color: '#9395c2' },
  { key: 'writing', label: '서술력', color: '#b1a284' },
  { key: 'speech', label: '구술력', color: '#79a8ac' },
];

export const STAT_LABEL = Object.fromEntries(STATS.map(({ key, label }) => [key, label]));

export const SKILL_KEYS = ['math', 'science', 'writing', 'speech'];

export const LOWER_IS_BETTER = ['stress'];

export function formatEffect(effect) {
  return Object.entries(effect)
    .map(([key, amount]) => `${STAT_LABEL[key]} ${amount > 0 ? '+' : '-'}${Math.abs(amount)}`)
    .join(' · ');
}
