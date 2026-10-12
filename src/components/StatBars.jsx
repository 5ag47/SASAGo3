import { STATS } from '../data/stats.js';

export default function StatBars({ stats, all = false }) {
  return (
    <div className={`stat-list ${all ? 'all-stats' : ''}`}>
      {STATS.slice(0, all ? 8 : 6).map(stat => (
        <div className="stat-row" key={stat.key}>
          <span>{stat.label}</span>
          <div className="stat-track" role="meter" aria-label={stat.label} aria-valuenow={stats[stat.key]} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${stats[stat.key]}%`, background: stat.color }} />
          </div>
          <b>{stats[stat.key]}</b>
        </div>
      ))}
    </div>
  );
}
