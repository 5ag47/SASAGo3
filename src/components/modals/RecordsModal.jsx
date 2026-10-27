import { ClipboardList } from 'lucide-react';
import { ACTIVITIES } from '../../data/activities.js';
import { ACTIVE_STATS } from '../../data/stats.js';
import { endingFor } from '../../data/story.js';
import { dateLabel } from '../../game.js';
import DeltaChip from '../DeltaChip.jsx';
export default function RecordsModal({
  history,
  ended,
  stats
}) {
  if (!history.length) return <div className="empty-state"><ClipboardList size={38} /><h3>아직 기록이 없어요</h3><p>한 주를 진행하면 이야기와 활동, 용돈 정산이 여기에 남아요.</p></div>;
  return <>{ended && <div className="ending-card"><span className="eyebrow">MY SEMESTER</span><h3>{endingFor(stats)}</h3><p>한 학기를 끝까지 걸어온 너에게 박수를!</p></div>}<div className="history-list">{[...history].reverse().map(entry => <article className="history-item" key={entry.week}>
    <h3>{dateLabel(entry.week)}</h3><p className="history-plan">{entry.plan.map(id => id === 'science' ? entry.major || '주요선택1' : ACTIVITIES[id].label).join(' · ')}</p>
    <div className="history-deltas">{ACTIVE_STATS.filter(({
            key
          }) => entry.delta[key] !== 0).map(({
            key
          }) => <DeltaChip key={key} statKey={key} value={entry.delta[key]} withLabel />)}</div>
    {entry.story && <div className="story-result"><h3>{entry.story.title}</h3><small>선택 · {entry.story.choice}</small><p>{entry.story.outcome}</p></div>}
    {entry.economy && <p className="ledger-summary">용돈 +{entry.economy.allowance.toLocaleString()} · 목표 +{entry.economy.reward.toLocaleString()} · 평판 +{entry.economy.bonus.toLocaleString()} · 벌금 -{entry.economy.fine.toLocaleString()}원</p>}
    {entry.daily && <details className="record-details"><summary>요일별 활동 보기</summary><div className="daily-log">{entry.daily.map(day => <article key={day.day}><span>{day.day}</span><div><b>{day.label}</b><p>{day.summary}</p></div></article>)}</div></details>}
    {entry.notes.length > 0 && <ul className="result-notes">{entry.notes.map(note => <li key={note}>{note}</li>)}</ul>}
  </article>)}</div></>;
}
