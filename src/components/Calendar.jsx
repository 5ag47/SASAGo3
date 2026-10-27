import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ACTIVITIES, DAYS } from '../data/activities.js';
import { EVENTS } from '../data/schedule.js';
import { weekDate } from '../game.js';
const DAY_MS = 86400000;
const eventLabels = Object.fromEntries(EVENTS.map(event => [event.date, event.label]));
export default function Calendar({
  game
}) {
  const [offset, setOffset] = useState(0);
  const start = weekDate(game.ended ? Math.max(0, game.week - 1) : game.week);
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const firstWeekday = (current.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return <>
      <h3 className="calendar-section-label">{game.ended ? '마지막 주 계획' : '이번 주 · 월요일부터 일요일까지'}</h3>
      <div className="week-calendar">{DAYS.map((day, index) => <div key={day}><span>{day}</span><b>{new Date(start.getTime() + index * DAY_MS).getUTCDate()}</b><small>{game.plan[index] === 'science' ? game.major : ACTIVITIES[game.plan[index]].label}</small></div>)}</div>

      <div className="calendar-nav">
        <button className="icon-button" aria-label="이전 달" onClick={() => setOffset(v => v - 1)}><ChevronLeft size={20} /></button>
        <h3>{year}년 {month + 1}월</h3>
        <button className="icon-button" aria-label="다음 달" onClick={() => setOffset(v => v + 1)}><ChevronRight size={20} /></button>
      </div>
      <div className="calendar-grid">
        {DAYS.map(day => <strong key={day}>{day}</strong>)}
        {Array.from({
        length: firstWeekday
      }, (_, i) => <div key={`empty${i}`} />)}
        {Array.from({
        length: dayCount
      }, (_, i) => {
        const date = new Date(Date.UTC(year, month, i + 1));
        const index = (date - start) / DAY_MS;
        const thisWeek = index >= 0 && index < 7;
        const eventLabel = eventLabels[date.toISOString().slice(0, 10)];
        return <div key={i} className={`${thisWeek ? 'this-week' : ''} ${index === 0 ? 'today' : ''}`}>
              <span>{i + 1}</span>
              {thisWeek && <small>{game.plan[index] === 'science' ? game.major : ACTIVITIES[game.plan[index]].label}</small>}
              {eventLabel && <small>{eventLabel}</small>}
            </div>;
      })}
      </div>
    </>;
}
