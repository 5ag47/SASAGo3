import { dateLabel } from '../../game.js';
import { StatLog, DailyLog } from '../StatLog.jsx';
export default function RecordsModal({
  history
}) {
  if (!history.length) return <div className="empty-state"><h3>기록 없음</h3></div>;
  return <div className="history-list">{[...history].reverse().map(entry => <article className="history-item" key={entry.week}>
    <h3>{dateLabel(entry.week)}</h3><StatLog entry={entry} />
    {entry.daily && <details className="record-details"><summary>요일별 활동</summary><DailyLog daily={entry.daily} /></details>}
    {entry.economy && <div className="record-money"><span>용돈 정산</span><b>{entry.economy.net >= 0 ? '+' : ''}{entry.economy.net.toLocaleString('ko-KR')}원</b></div>}
  </article>)}</div>;
}
