import { ACTIVE_STATS } from '../data/stats.js';
export default function StatBars({
  stats,
  all = false,
  major = '주요선택1'
}) {
  return <div className={`stat-list ${all ? 'all-stats' : ''}`}>{ACTIVE_STATS.map(stat => <div className="stat-row" key={stat.key}>
    <span>{stat.key === 'science' ? major : stat.label}</span>
    <div className="stat-track" role="meter" aria-label={stat.key === 'science' ? major : stat.label} aria-valuenow={stats[stat.key]} aria-valuemin={0} aria-valuemax={100}><i style={{
          width: `${stats[stat.key]}%`,
          background: stat.color
        }} /></div><b>{stats[stat.key]}</b>
  </div>)}</div>;
}
