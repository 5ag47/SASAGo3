import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthCells, weekDate } from '../../domain/calendar-date.js';
import { calendarEntries } from '../../domain/calendar-entries.js';
import { DAYS } from '../../domain/catalog.js';
import { activityName } from './ui.jsx';
import './calendar.css';
export function CalendarPanel({ state, onMonth }) {
  const today = weekDate(state.week, Math.min(6, Math.floor((state.weekRun?.cursor ?? 0) / 3)));
  const [visible, setVisible] = useState(today.slice(0, 7)),
    [selected, setSelected] = useState(today);
  const [year, month] = visible.split('-').map(Number);
  const entries = useMemo(() => calendarEntries(state), [state]);
  const cells = monthCells(year, month),
    dayEntries = entries.filter((entry) => entry.date === selected);
  const weekEntries = entries.filter(
    (entry) => entry.start && selected >= entry.start && selected <= entry.end,
  );
  function move(amount) {
    const date = new Date(Date.UTC(year, month - 1 + amount, 1));
    const next = date.toISOString().slice(0, 7);
    setVisible(next);
    onMonth?.(date.getUTCMonth() + 1);
  }
  return (
    <section className="academic-calendar">
      <header className="calendar-heading">
        <button aria-label="이전 달" onClick={() => move(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h3>
          {year}년 {month}월
        </h3>
        <button aria-label="다음 달" onClick={() => move(1)}>
          <ChevronRight size={20} />
        </button>
        <button
          className="subtle"
          onClick={() => {
            setVisible(today.slice(0, 7));
            setSelected(today);
            onMonth?.(Number(today.slice(5, 7)));
          }}
        >
          이번 주
        </button>
      </header>
      <div className="calendar-grid" role="grid" aria-label={year + '년 ' + month + '월'}>
        {DAYS.map((day) => (
          <b role="columnheader" key={day}>
            {day}
          </b>
        ))}
        {cells.map((cell) => {
          const items = entries.filter(
            (entry) => entry.date === cell.date && entry.type !== 'plan',
          );
          return (
            <button
              role="gridcell"
              key={cell.date}
              aria-label={
                cell.date +
                (items.length ? ' · ' + items.map((entry) => entry.name).join(', ') : '')
              }
              aria-selected={selected === cell.date}
              data-current-week={cell.week === state.week}
              data-today={cell.date === today}
              data-other-month={!cell.inMonth}
              onClick={() => setSelected(cell.date)}
            >
              <span>{cell.number}</span>
              {items.slice(0, 2).map((item) => (
                <small key={item.id} className={item.type}>
                  {item.name}
                </small>
              ))}
              {items.length > 2 && <em>+{items.length - 2}</em>}
              {cell.week === state.week && state.week <= 40 && <i aria-label="내 일정" />}
            </button>
          );
        })}
      </div>
      <section className="calendar-day-detail">
        <h3>
          {selected.replaceAll('-', '.')}{' '}
          <small>{DAYS[(new Date(selected + 'T00:00:00Z').getUTCDay() + 6) % 7]}요일</small>
        </h3>
        {dayEntries.length ? (
          dayEntries.map((entry) => (
            <article key={entry.id} className={entry.type}>
              <b>
                {entry.name}
                {entry.activity ? ' · ' + activityName(entry.activity) : ''}
              </b>
              {entry.detail && <p>{entry.detail}</p>}
            </article>
          ))
        ) : (
          <p>등록된 일정 없음</p>
        )}
        {weekEntries.length > 0 && (
          <details open>
            <summary>이 주에 예정된 일정</summary>
            {weekEntries.map((entry) => (
              <article key={entry.id}>
                <b>{entry.name}</b>
                <small>요일 미정</small>
              </article>
            ))}
          </details>
        )}
      </section>
    </section>
  );
}
