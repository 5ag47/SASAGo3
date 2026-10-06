import { LOWER_IS_BETTER, STAT_LABEL } from '../data/stats.js';

function tone(key, value) {
  if (value === 0) return 'flat';
  const improved = LOWER_IS_BETTER.includes(key) ? value < 0 : value > 0;
  return improved ? 'good' : 'bad';
}

export function formatDelta(value) {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '-'}${Math.abs(value)}`;
}

export default function DeltaChip({ statKey, value, withLabel = false }) {
  return (
    <span className={`delta ${tone(statKey, value)}`}>
      {withLabel && `${STAT_LABEL[statKey]} `}{formatDelta(value)}
    </span>
  );
}
