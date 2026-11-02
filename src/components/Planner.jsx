import { BookOpen, Check } from 'lucide-react';
import { ACTIVITIES, DAYS, LOCATIONS } from '../data/activities.js';
import { SLEEP_OPTIONS } from '../data/sleep.js';
const available = Object.entries(ACTIVITIES).filter(([id]) => !['interview', 'write'].includes(id));
export default function Planner({
  game,
  editor
}) {
  const {
    selectedDay,
    draft,
    setDraft,
    sleepDraft,
    setSleepDraft,
    dirty,
    selectDay,
    applyPlan,
    resetDraft
  } = editor;
  const activity = ACTIVITIES[draft];
  const label = id => id === 'science' ? game.major : ACTIVITIES[id].label;
  const locations = LOCATIONS.filter(place => available.some(([, a]) => a.place === place));
  return <aside className="right-panels"><section className="planner">
    <div className="planner-heading"><h2>이번 주 일정</h2></div>
    <div className="day-tabs">{DAYS.map((day, index) => <button key={day} className={index === selectedDay ? 'active' : ''} aria-pressed={index === selectedDay} onClick={() => selectDay(index)}><span>{day}</span><b>{label(game.plan[index])}</b><small>수면 {game.sleepPlan[index]}h</small></button>)}</div>
    <div className="application-title"><BookOpen size={16} /><h3>일정 신청</h3><span>{DAYS[selectedDay]}요일</span></div>
    <fieldset className="application-body" disabled={game.ended}>
      <label className="field-label" htmlFor="place">장소</label>
      <select id="place" value={activity.place} onChange={e => setDraft(available.find(([, a]) => a.place === e.target.value)[0])}>
        {!locations.includes(activity.place) && <option>{activity.place}</option>}{locations.map(place => <option key={place}>{place}</option>)}
      </select>
      <label className="field-label" htmlFor="reason">활동</label>
      <select id="reason" value={draft} onChange={e => setDraft(e.target.value)}>
        {['interview', 'write'].includes(draft) && <option value={draft}>{activity.label}</option>}
        {available.filter(([, a]) => a.place === activity.place).map(([id, a]) => <option key={id} value={id}>{id === 'science' ? game.major : a.reason}</option>)}
      </select>
      <label className="field-label" htmlFor="sleep-hours">수면</label>
      <select id="sleep-hours" value={sleepDraft} onChange={e => setSleepDraft(Number(e.target.value))}>
        {SLEEP_OPTIONS.map(hours => <option key={hours} value={hours}>{hours}시간</option>)}
      </select>
      <button className="primary apply-button" onClick={applyPlan}>{dirty ? '변경 신청' : '신청하기'}<Check size={16} /></button>
      {dirty && <button className="cancel-edit" onClick={resetDraft}>취소</button>}
    </fieldset>
  </section></aside>;
}
