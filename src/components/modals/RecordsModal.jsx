import { ClipboardList } from 'lucide-react';
import { ACTIVITIES } from '../../data/activities.js';
import { STATS } from '../../data/stats.js';
import { dateLabel } from '../../game.js';
import DeltaChip from '../DeltaChip.jsx';

export default function RecordsModal({ history }) {
  if (history.length === 0) {
    return (
      <div className="empty-state">
        <ClipboardList size={38} />
        <h3>기록이 없습니다</h3>
        <p>한 주를 진행하면 주간 결과가 여기에 쌓여요.</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      {[...history].reverse().map(entry => (
        <article className="history-item" key={entry.week}>
          <h3>{dateLabel(entry.week)}</h3>
          <p className="history-plan">{entry.plan.map(id => ACTIVITIES[id].label).join(' · ')}</p>
          <div className="history-deltas">
            {STATS.filter(({ key }) => entry.delta[key] !== 0).map(({ key }) => (
              <DeltaChip key={key} statKey={key} value={entry.delta[key]} withLabel />
            ))}
          </div>
          {entry.notes.length > 0 && <ul className="result-notes">{entry.notes.map(note => <li key={note}>{note}</li>)}</ul>}
        </article>
      ))}
    </div>
  );
}
