import { useState } from 'react';
import { Check, Play } from 'lucide-react';
import { ACTIVITIES, DAYS } from '../../data/activities.js';
import { storyForWeek } from '../../data/story.js';
import { StatLog, DailyLog } from '../StatLog.jsx';
export function WeekPlanModal({
  game,
  onStart
}) {
  return <><div className="week-review">{DAYS.map((day, index) => <div key={day}><span>{day}</span><b>{game.plan[index] === 'science' ? game.major : ACTIVITIES[game.plan[index]].label}</b><p>{ACTIVITIES[game.plan[index]].place}</p><small>수면 {game.sleepPlan[index]}시간</small></div>)}</div>
    <button className="primary full-width" onClick={onStart}>시작 <Play size={16} /></button></>;
}
export function StoryModal({
  game,
  onChoose
}) {
  const [busy, setBusy] = useState(false);
  return <div className="story-choices">{storyForWeek(game.week).choices.map((choice, index) => <button key={index} className="story-choice" disabled={busy} onClick={() => {
      setBusy(true);
      onChoose(index);
    }}><b>{choice.label}</b></button>)}</div>;
}
export function WeekResultModal({
  entry,
  ended,
  onClose
}) {
  const [tab, setTab] = useState('stats');
  return <>{ended && <h3 className="semester-complete">학기 종료</h3>}
    <div className="auth-tabs" role="group" aria-label="결과 보기">{[['stats', '스탯 변화'], ['days', '요일별 활동'], ['money', '용돈 정산']].map(([id, label]) => <button key={id} aria-pressed={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === 'stats' && <StatLog entry={entry} />}
    {tab === 'days' && <DailyLog daily={entry.daily} />}
    {tab === 'money' && entry.economy && <div className="money-log">{[['allowance', '기본 용돈'], ['bonus', '평판 용돈'], ['fine', '벌금'], ['net', '합계']].map(([key, label]) => <div key={key}><span>{label}</span><b>{key === 'fine' ? '-' : '+'}{entry.economy[key].toLocaleString('ko-KR')}원</b></div>)}</div>}
    {entry.assessment != null && <div className="assessment">모의 평가 <b>{entry.assessment} / 100</b></div>}
    <button className="primary full-width" onClick={onClose}>확인 <Check size={16} /></button>
  </>;
}
