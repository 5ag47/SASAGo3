import { ACTIVE_STATS, STATS } from '../data/stats.js';
import DeltaChip from './DeltaChip.jsx';
export function StatLog({
  entry
}) {
  return <div className="log-table-wrap"><table className="stat-log-table">
    <thead><tr><th scope="col">스탯</th><th scope="col">이전</th><th scope="col">현재</th><th scope="col">변화</th></tr></thead>
    <tbody>{ACTIVE_STATS.map(({
          key,
          label
        }) => <tr key={key}><th scope="row">{key === 'science' ? entry.major || label : label}</th><td>{entry.before?.[key] ?? '—'}</td><td>{entry.after?.[key] ?? '—'}</td><td><DeltaChip statKey={key} value={entry.delta[key]} /></td></tr>)}</tbody>
  </table></div>;
}
function changesFor(day) {
  if (day.delta) return Object.entries(day.delta);
  // Old histories contain only a formatted summary. Show recognized numeric changes, never prose.
  return (day.summary || '').split(' · ').flatMap(part => {
    const match = part.match(/^(.+?)\s+([+-]\d+)$/);
    const stat = match && STATS.find(item => item.label === match[1]);
    return stat ? [[stat.key, Number(match[2])]] : [];
  });
}
export function DailyLog({
  daily = []
}) {
  return <div className="daily-log">{daily.map(day => <article key={day.day}>
    <span className="log-day">{day.day}</span><div><b>{day.label}</b>{day.sleepHours !== undefined && <span className="sleep-log-label"> · 수면 {day.sleepHours}시간</span>}<div className="log-chips">{changesFor(day).filter(([, value]) => value !== 0).map(([key, value]) => <DeltaChip key={key} statKey={key} value={value} withLabel />)}</div></div>
  </article>)}</div>;
}
