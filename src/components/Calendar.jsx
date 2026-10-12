import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ACTIVITIES, DAYS } from '../data/activities.js';
import { EVENTS } from '../data/schedule.js';
import { weekDate } from '../game.js';

const DAY_MS = 86400000;
const eventLabels = Object.fromEntries(EVENTS.map(event => [event.date, event.label]));

export default function Calendar({ game }) {
  const [offset, setOffset] = useState(0);
  const start = weekDate(game.week);
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const firstWeekday = (current.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return (
    <>
      <div className="calendar-nav">
        <button className="icon-button" aria-label="이전 달" onClick={() => setOffset(v => v - 1)}><ChevronLeft size={20} /></button>
        <h3>{year}년 {month + 1}월</h3>
        <button className="icon-button" aria-label="다음 달" onClick={() => setOffset(v => v + 1)}><ChevronRight size={20} /></button>
      </div>
      <div className="calendar-grid">
        {[...DAYS, '일'].map(day => <strong key={day}>{day}</strong>)}
        {Array.from({ length: firstWeekday }, (_, i) => <div key={`empty${i}`} />)}
        {Array.from({ length: dayCount }, (_, i) => {
          const date = new Date(Date.UTC(year, month, i + 1));
          const index = (date - start) / DAY_MS;
          const thisWeek = index >= 0 && index < 7;
          const eventLabel = eventLabels[date.toISOString().slice(0, 10)];
          return (
            <div key={i} className={`${thisWeek ? 'this-week' : ''} ${index === 0 ? 'today' : ''}`}>
              <span>{i + 1}</span>
              {thisWeek && <small>{index < 6 ? ACTIVITIES[game.plan[index]].label : '휴식'}</small>}
              {eventLabel && <small>{eventLabel}</small>}
            </div>
          );
        })}
      </div>
      <p className="calendar-key"><span /> 이번 주 일정 <small>선택한 활동은 메인 화면에서 변경할 수 있어요.</small></p>
    </>
  );
}
