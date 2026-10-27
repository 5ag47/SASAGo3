import { useState } from 'react';
import { courses, events, period } from '../../domain/catalog.js';
import { assessmentsAt, CLEANING_WEEKS } from '../../domain/school-calendar.js';

export function CalendarPanel({ state, onMonth }) {
  const [month, setMonth] = useState(period(state.week).month);
  const entries = Object.entries(events).filter(([, e]) => period(e.week).month === month);
  return (
    <>
      <p className="dialog-lead">
        한 달은 4주로 구성한 게임 속 학사 일정이에요. 실제 학교 일정과는 달라요.
      </p>
      <div className="month-picker">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
          <button
            key={m}
            className={month === m ? 'selected' : ''}
            onClick={() => {
              setMonth(m);
              onMonth?.(m);
            }}
          >
            {m === 2 ? '겨울' : `${m}월`}
          </button>
        ))}
      </div>
      <div className="calendar-weeks">
        {[1, 2, 3, 4]
          .filter((n) => month !== 2 || n === 1)
          .map((n) => {
            const week = month === 2 ? 0 : (month - 3) * 4 + n;
            return (
              <article key={n} className={state.week === week ? 'current' : ''}>
                <h3>
                  {n}주차 {state.week === week && <small>이번 주</small>}
                </h3>
                {entries
                  .filter(([, e]) => period(e.week).weekOfMonth === n)
                  .map(([id, e]) => (
                    <p key={id}>
                      <i className={e.kind === 'task' ? 'purple' : 'sage'} />
                      {e.name}
                      {e.course && <small>{courses[e.course].short} 수강 시</small>}
                    </p>
                  ))}
                {assessmentsAt(week).map((exam) => (
                  <p key={exam.kind}>
                    <i className={exam.kind === 'quiz' ? 'blue' : 'rose'} />
                    {exam.name}
                  </p>
                ))}
                {CLEANING_WEEKS.includes(week) && (
                  <p>
                    <i className="sand" />
                    호실 점검
                  </p>
                )}
              </article>
            );
          })}
      </div>
    </>
  );
}
