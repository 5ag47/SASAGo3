import { ChevronRight, Heart } from 'lucide-react';
import { conditionNote } from '../data/dialogue.js';
import StatBars from './StatBars.jsx';

export default function StatsCard({ stats, onOpen }) {
  return (
    <section className="stats-card">
      <div className="card-heading">
        <h2><Heart size={15} /> 나의 컨디션</h2>
        <button onClick={onOpen} aria-label="전체 능력치 보기"><ChevronRight size={17} /></button>
      </div>
      <StatBars stats={stats} />
      <div className="stats-note"><span className="status-dot" /> {conditionNote(stats)}</div>
    </section>
  );
}
