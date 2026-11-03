import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Clock, Sparkles } from 'lucide-react';
import { courses, DAYS, events, period, STATS } from '../../domain/catalog.js';
import { Delta, Empty, activityName, SESSIONS } from './ui.jsx';
import './academic.css';
import { StoryLibrary } from './StoryPanel.jsx';

export function WeekResult({ entry, onContinue, onRead, children }) {
  useEffect(() => {
    onRead?.();
  }, [entry.week, onRead]);
  const number = (value) => (Number.isFinite(value) ? Math.round(value * 10) / 10 : '—');
  return (
    <>
      <span className="event-kicker">{entry.label}</span>
      <table className="stat-change-table">
        <thead>
          <tr>
            <th>능력치</th>
            <th>이전 → 이후</th>
            <th>변화</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(entry.delta).map(([key, value]) => (
            <tr key={key}>
              <td>{STATS[key].name}</td>
              <td>
                {number(entry.beforeStats?.[key])} → {number(entry.afterStats?.[key])}
              </td>
              <td>
                <Delta value={value} stat={key} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {Object.keys(entry.courseDelta ?? {}).length > 0 && (
        <details className="course-mark-details">
          <summary>과목 이해도 변화</summary>
          {Object.entries(entry.courseDelta).map(([id, delta]) => (
            <p key={id}>
              {courses[id].name}{' '}
              <span>
                {entry.beforeCourses?.[id]} → {entry.afterCourses?.[id]}
              </span>{' '}
              <b>+{delta}</b>
            </p>
          ))}
        </details>
      )}
      <div className="result-money">
        용돈 변화{' '}
        <b>
          {entry.moneyDelta > 0 ? '+' : ''}
          {entry.moneyDelta.toLocaleString()}원
        </b>
      </div>
      <div className="result-messages">
        {entry.messages.map((text, i) => (
          <p key={i}>
            <span>{text.startsWith('완료') ? <Check size={14} /> : <Clock size={13} />}</span>
            {text}
          </p>
        ))}
      </div>
      <details className="action-log">
        <summary>
          21칸 활동 기록 <ChevronDown size={14} />
        </summary>
        {entry.actions.map((a) => (
          <div key={a.index}>
            <small>
              {DAYS[Math.floor(a.index / 3)]} · {SESSIONS[a.index % 3]}
            </small>
            <b>{activityName(a.activity)}</b>
            <span>
              {a.note}
              <em className="action-deltas">
                {Object.entries(a.delta)
                  .filter(([, v]) => v !== 0)
                  .map(([stat, value]) => (
                    <span key={stat}>
                      {STATS[stat].name} <Delta value={value} stat={stat} />
                    </span>
                  ))}
              </em>
            </span>
          </div>
        ))}
      </details>
      {children}
      <button className="primary full" onClick={onContinue}>
        확인 <ArrowRight size={16} />
      </button>
    </>
  );
}
export function RecordsPanel({ state, onRead, onStory }) {
  const [selected, setSelected] = useState(null);
  if (!state.history.length)
    return (
      <>
        <StoryLibrary state={state} onOpen={onStory} />
        <Empty>아직 진행 기록이 없습니다.</Empty>
      </>
    );
  const entry = state.history.find((h) => h.week === selected);
  return (
    <>
      {entry ? (
        <>
          <button className="subtle" onClick={() => setSelected(null)}>
            ← 전체 기록
          </button>
          <WeekResult
            entry={entry}
            onContinue={() => setSelected(null)}
            onRead={entry.week === 0 ? onRead : undefined}
          />
        </>
      ) : (
        <>
          <StoryLibrary state={state} onOpen={onStory} />
          <p className="dialog-lead">
            내가 보낸 {state.history.length}주의 기록. 한 주를 눌러 활동별 결과와 이유를 확인하세요.
          </p>
          <div className="records-list">
            {[...state.history].reverse().map((h) => (
              <button key={h.week} onClick={() => setSelected(h.week)}>
                <span className="record-week">
                  {String(h.week + 1).padStart(2, '0')}
                  <small>WEEK</small>
                </span>
                <span>
                  <b>{h.label}</b>
                  <small>
                    수학 {h.delta.math >= 0 ? '+' : ''}
                    {h.delta.math} · 스트레스 {h.delta.stress >= 0 ? '+' : ''}
                    {h.delta.stress} · {h.messages.filter((m) => m.startsWith('완료')).length}개
                    완료
                  </small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
export function NoticesPanel({ state, onReview, onTask, onStory }) {
  const notices = state.notices.filter(
    (n) => n.kind !== 'choice' || !state.pending.some((id) => events[id]?.name === n.title),
  );
  return (
    <div className="notices-list">
      {notices.length
        ? notices.map((n) => (
            <article key={n.id}>
              <small>
                {period(n.week).label} ·{' '}
                {n.kind === 'choice'
                  ? '선택 이벤트'
                  : n.kind === 'event'
                    ? '결과'
                    : n.kind === 'rumor'
                      ? '소문'
                      : '안내'}
              </small>
              <h3>{n.title}</h3>
              <p>{n.text}</p>
              {n.chapter && onStory && (
                <button className="subtle" onClick={() => onStory(n.chapter)}>
                  이야기 읽기
                </button>
              )}
              {n.task && state.tasks[n.task] && onTask && (
                <button className="subtle" onClick={() => onTask(n.task)}>
                  할 일 보기
                </button>
              )}
              {onReview &&
                n.title === '실전 면접 기록' &&
                state.minigames.interview?.phase === 'finished' && (
                  <button className="subtle" onClick={() => onReview('interview_day')}>
                    답변 돌아보기
                  </button>
                )}
              {onReview &&
                n.title === '기숙사 고스톱 결과' &&
                state.minigames.cards?.phase === 'finished' && (
                  <button className="subtle" onClick={() => onReview('dorm_cards')}>
                    판 결과 보기
                  </button>
                )}
            </article>
          ))
        : !state.pending.length && <Empty>알림이 없습니다.</Empty>}
    </div>
  );
}
