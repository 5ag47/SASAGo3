import { ChevronRight, Heart } from 'lucide-react';
import { conditionNote } from '../data/dialogue.js';
import { studyEfficiency } from '../systems/week.js';
import StatBars from './StatBars.jsx';
export default function StatsCard({
  stats,
  major,
  onOpen
}) {
  return <section className="stats-card"><div className="card-heading"><h2><Heart size={15} /> 나의 스탯</h2><button onClick={onOpen} aria-label="전체 능력치 보기"><ChevronRight size={17} /></button></div>
    <div className="efficiency"><span>학습 능률</span><b>{Math.round(studyEfficiency(stats).value * 100)}<small>%</small></b></div>
    <StatBars stats={stats} major={major} /><div className="stats-note"><span className="status-dot" /> {conditionNote(stats)}</div>
  </section>;
}
