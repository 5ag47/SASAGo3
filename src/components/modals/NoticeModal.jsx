import { EVENTS } from '../../data/schedule.js';
import { weekDate } from '../../game.js';
export default function NoticeModal({
  game
}) {
  const start = weekDate(game.week).getTime();
  const events = EVENTS.filter(event => Date.parse(event.date) >= start);
  return <div className="notice-list">
    {game.ended ? <p>학기 종료</p> : events.length ? events.map(event => <article key={event.date}><time>{event.date}</time><b>{event.label}</b></article>) : <p>새 알림 없음</p>}
  </div>;
}
