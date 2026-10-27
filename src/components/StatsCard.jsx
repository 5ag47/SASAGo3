import { ChevronRight, Heart } from 'lucide-react';
import StatBars from './StatBars.jsx';
export default function StatsCard({
  stats,
  major,
  onOpen
}) {
  return <section className="stats-card"><div className="card-heading"><h2><Heart size={16} />스탯</h2><button onClick={onOpen} aria-label="전체 스탯 보기"><ChevronRight size={18} /></button></div><StatBars stats={stats} major={major} /></section>;
}
