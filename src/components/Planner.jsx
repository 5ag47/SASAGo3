import { BookOpen, Bell, CalendarDays, Check, Coffee } from 'lucide-react';
import { ACTIVITIES, DAYS, LOCATIONS } from '../data/activities.js';
import { formatEffect } from '../data/stats.js';
import { storyForWeek } from '../data/story.js';
const available = Object.entries(ACTIVITIES).filter(([id]) => !['interview', 'write'].includes(id));
export default function Planner({
  game,
  editor,
  onOpenCalendar,
  onOpenNotice
}) {
  const {
    selectedDay,
    draft,
    setDraft,
    dirty,
    selectDay,
    applyPlan,
    resetDraft
  } = editor;
  const activity = ACTIVITIES[draft];
  const label = id => id === 'science' ? game.major : ACTIVITIES[id].label;
  const locations = LOCATIONS.filter(place => available.some(([, a]) => a.place === place));
  return <aside className="right-panels"><section className="planner">
    <div className="planner-heading"><h2>이번 주 일정</h2><button aria-label="이번 주 달력 보기" onClick={onOpenCalendar}><CalendarDays size={17} /></button></div>
    <div className="day-tabs">{DAYS.map((day, index) => <button key={day} className={index === selectedDay ? 'active' : ''} aria-pressed={index === selectedDay} onClick={() => selectDay(index)}><span>{day}</span><b>{label(game.plan[index])}</b><i className={ACTIVITIES[game.plan[index]].type} /></button>)}</div>
    <div className="application-title"><BookOpen size={15} /><h3>자율학습 신청</h3><span>{DAYS[selectedDay]}요일</span></div>
    <fieldset className="application-body" disabled={game.ended}>
      <label className="field-label" htmlFor="place">장소</label>
      <select id="place" value={activity.place} onChange={e => setDraft(available.find(([, a]) => a.place === e.target.value)[0])}>
        {!locations.includes(activity.place) && <option>{activity.place}</option>}{locations.map(place => <option key={place}>{place}</option>)}
      </select>
      <label className="field-label" htmlFor="reason">활동</label>
      <select id="reason" value={draft} onChange={e => setDraft(e.target.value)}>
        {['interview', 'write'].includes(draft) && <option value={draft}>{activity.label} (이전 저장)</option>}
        {available.filter(([, a]) => a.place === activity.place).map(([id, a]) => <option key={id} value={id}>{id === 'science' ? `${game.major} 심층 공부` : a.reason}</option>)}
      </select>
      <p className="activity-hint">{activity.type === 'rest' ? <Coffee size={14} /> : <BookOpen size={14} />} {formatEffect(activity.effect)}</p>
      <button className="primary apply-button" onClick={applyPlan}>{dirty ? '변경한 일정 신청하기' : '신청하기'}<Check size={16} /></button>{dirty && <button className="cancel-edit" onClick={resetDraft}>변경 취소</button>}
    </fieldset><div className="planner-foot">일요일은 자동 휴식 · 주요선택1 {game.major}</div>
  </section><button className="notice-card" onClick={onOpenNotice}><span className="notice-icon"><Bell size={16} /></span><span><small>SASA TALK {game.noticeReadWeek < game.week && <i>NEW</i>}</small><b>{game.ended ? '한 학기 수고했어!' : storyForWeek(game.week).title}</b></span><span aria-hidden="true">›</span></button></aside>;
}
