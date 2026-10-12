import { BookOpen, Bell, CalendarDays, Check, ChevronRight, Coffee } from 'lucide-react';
import { ACTIVITIES, DAYS, LOCATIONS } from '../data/activities.js';
import { formatEffect } from '../data/stats.js';

export default function Planner({ game, editor, onOpenCalendar, onOpenNotice }) {
  const { selectedDay, draft, setDraft, dirty, selectDay, applyPlan, resetDraft } = editor;
  const activity = ACTIVITIES[draft];

  return (
    <aside className="right-panels">
      <section className="planner">
        <div className="planner-heading">
          <h2>나의 일주일</h2>
          <button aria-label="주간 달력 열기" onClick={onOpenCalendar}><CalendarDays size={17} /></button>
        </div>
        <div className="day-tabs">
          {DAYS.map((day, index) => {
            const planned = ACTIVITIES[game.plan[index]];
            return (
              <button key={day} className={index === selectedDay ? 'active' : ''} aria-pressed={index === selectedDay} onClick={() => selectDay(index)}>
                <span>{day}</span>
                <b>{planned.label}</b>
                <i className={planned.type} />
              </button>
            );
          })}
        </div>
        <div className="application-title">
          <BookOpen size={15} />
          <h3>자율학습 신청</h3>
          <span>{DAYS[selectedDay]}요일</span>
        </div>
        <div className="application-body">
          <label className="field-label" htmlFor="place">장소</label>
          <select
            id="place"
            value={activity.place}
            onChange={e => setDraft(Object.keys(ACTIVITIES).find(id => ACTIVITIES[id].place === e.target.value))}
          >
            {LOCATIONS.map(place => <option key={place}>{place}</option>)}
          </select>
          <label className="field-label" htmlFor="reason">사유</label>
          <select id="reason" value={draft} onChange={e => setDraft(e.target.value)}>
            {Object.entries(ACTIVITIES)
              .filter(([, a]) => a.place === activity.place)
              .map(([id, a]) => <option key={id} value={id}>{a.reason}</option>)}
          </select>
          <p className="activity-hint">
            {activity.type === 'rest' ? <Coffee size={14} /> : <BookOpen size={14} />}
            {formatEffect(activity.effect)}
          </p>
          <button className="primary apply-button" onClick={applyPlan}>
            {dirty ? '변경한 일정 신청하기' : '신청하기'}<Check size={16} />
          </button>
          {dirty && <button className="cancel-edit" onClick={resetDraft}>변경 취소</button>}
        </div>
        <div className="planner-foot"><span /> 일요일은 자동으로 휴식해요.</div>
      </section>
      <button className="notice-card" onClick={onOpenNotice}>
        <span className="notice-icon"><Bell size={16} /></span>
        <span><small>알림장</small><b>2학기 일정 안내</b></span>
        <ChevronRight size={17} />
      </button>
    </aside>
  );
}
