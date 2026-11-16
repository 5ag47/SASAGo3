import CampaignPlanner from './CampaignPlanner.jsx';
import { useState } from 'react';
import { ArrowRight, LayoutGrid, PencilLine, LockKeyhole, Play, X } from 'lucide-react';
import { activities, courses, DAYS, period } from '../../domain/catalog.js';
import { effectivePlan, lockedSlots } from '../../domain/week.js';
import { ActivityIcon, activityName, SESSIONS } from './ui.jsx';
import ContextHint from './ContextHint.jsx';
import DayCopy from './DayCopy.jsx';
import { weekForecast } from '../../domain/week-forecast.js';
import { STRAIN_STAGES, WORK_ACTIVITIES } from '../../domain/senior-year.js';

export default function Planner({
  state,
  busy,
  send,
  onSlot,
  onPreset,
  onCopy,
  onStart,
  onWeek,
  assignment,
  cancelAssignment,
  onClose,
}) {
  const [day, setDay] = useState(0);
  const plan = effectivePlan(state);
  const locked = lockedSlots(state);
  const studyCount = plan.filter((s) => WORK_ACTIVITIES.includes(s.activity)).length;
  const forecast = state.week <= 40 ? weekForecast(state) : null;
  const fee = plan.reduce((sum, slot) => sum + (activities[slot.activity].cost ?? 0), 0);
  return (
    <aside className="planner-panel">
      <header>
        <h2>
          자습 신청
          {forecast && (
            <span
              className={forecast.season.pressure >= 1.4 ? 'season-label busy' : 'season-label'}
            >
              {forecast.season.label}
            </span>
          )}
        </h2>
        <button className="schedule-button" onClick={onWeek}>
          <LayoutGrid size={15} /> 전체 일정
        </button>
        <button className="planner-close icon-button" onClick={onClose} aria-label="자습 신청 닫기">
          <X size={18} />
        </button>
      </header>
      <ContextHint state={state} onTry={onWeek} />
      {assignment && (
        <div className="assignment-banner">
          할 일을 넣을 시간을 선택하세요.
          <button onClick={cancelAssignment} aria-label="할 일 배정 취소">
            취소
          </button>
        </div>
      )}
      <div className="planner-days">
        {DAYS.map((label, i) => (
          <button
            key={label}
            className={day === i ? 'selected' : ''}
            onClick={() => setDay(i)}
            aria-pressed={day === i}
          >
            <span>
              {state.week === 12 && state.courses.includes('general_biology') && i >= 4
                ? '🍊'
                : label}
            </span>
            <i className={i >= 5 ? 'weekend' : ''} />
          </button>
        ))}
      </div>
      <div className="session-cards" data-tutorial="schedule">
        {SESSIONS.map((label, i) => {
          const index = day * 3 + i;
          const slot = plan[index];
          const activity = activities[slot.activity];
          return (
            <button
              key={label}
              className={`session-card ${activity.color} ${assignment && !locked[index] ? 'assignable' : ''}`}
              onClick={() => onSlot(index)}
              disabled={Boolean(locked[index]) || busy || state.week > 40 || Boolean(state.ending)}
              title={`${label} 활동 변경`}
            >
              <span className="session-time">
                {label}
                <small>{['07:30', '19:00', '21:00'][i]}</small>
              </span>
              <span className="session-icon">
                <ActivityIcon id={slot.activity} />
              </span>
              <span className="session-label">
                <b>{activityName(slot.activity)}</b>
                <small>
                  {slot.activity === 'study'
                    ? courses[slot.target]?.name
                    : slot.activity === 'task'
                      ? (state.tasks[slot.target]?.name ?? '과제 선택')
                      : locked[index]
                        ? '고정 일정'
                        : ''}
                </small>
              </span>
              {locked[index] ? <LockKeyhole size={12} /> : <PencilLine size={14} />}
            </button>
          );
        })}
      </div>
      <CampaignPlanner state={state} day={day} busy={busy} send={send} />
      <div className="preset-row">
        <span>{state.week === 0 && !state.flags.editedSchedule ? '예시 일정' : '빠른 편성'}</span>
        <button disabled={busy} onClick={() => onPreset('math')}>
          수학 집중
        </button>
        <button disabled={busy} onClick={() => onPreset('tasks')}>
          할 일 우선
        </button>
        <button disabled={busy} onClick={() => onPreset('rest')}>
          회복
        </button>
      </div>
      <DayCopy state={state} busy={busy} sourceDay={day} onCopy={onCopy} />
      <div className="week-minimap" aria-label="한 주 전체 일정">
        {DAYS.map((label, d) => (
          <button
            key={label}
            onClick={() => setDay(d)}
            className={d === day ? 'selected' : ''}
            aria-label={`${label}요일 일정 보기`}
          >
            <span>
              {state.week === 12 && state.courses.includes('general_biology') && d >= 4
                ? '🍊'
                : label}
            </span>
            <i
              className={state.campaign.nights[d].activity === 'study' ? 'blue' : 'sage'}
              title="연장"
            />
            {[0, 1, 2].map((s) => (
              <i key={s} className={activities[plan[d * 3 + s].activity].color} />
            ))}
          </button>
        ))}
      </div>
      <div className="plan-summary">
        <span>
          <i className="blue-dot" />
          학습 {studyCount}칸
        </span>
        <span>
          <i className="sage-dot" />
          생활·회복 {21 - studyCount}칸
        </span>
      </div>
      {forecast && (
        <div
          className={`week-forecast stage-${forecast.stage}`}
          title="미니게임·이벤트·시험 결과를 뺀 예상값"
        >
          <span>주말 예상</span>
          <b>체력 {forecast.hp}</b>
          <b>스트레스 {forecast.stress}</b>
          {forecast.stage > 0 && <em>{STRAIN_STAGES[forecast.stage].name}</em>}
        </div>
      )}
      {fee > 0 && <p className="plan-cost">예정 지출 {fee.toLocaleString()}원</p>}
      <button
        className="primary start-week"
        data-tutorial="confirm"
        disabled={busy || Boolean(state.ending)}
        onClick={onStart}
      >
        <Play size={17} fill="currentColor" />
        <span>
          {state.week > 40
            ? '나의 결말 선택하기'
            : busy
              ? '기록하는 중…'
              : state.weekRun
                ? '이어서 진행'
                : '한 주 진행'}
        </span>
        <ArrowRight size={18} />
      </button>
    </aside>
  );
}
