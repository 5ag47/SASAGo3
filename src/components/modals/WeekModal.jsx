import { useState } from 'react';
import { Check, Play } from 'lucide-react';
import { ACTIVITIES, DAYS } from '../../data/activities.js';
import { ACTIVE_STATS, formatEffect } from '../../data/stats.js';
import { storyForWeek, endingFor } from '../../data/story.js';
import { dateLabel } from '../../game.js';
import { studyEfficiency } from '../../systems/week.js';
import DeltaChip from '../DeltaChip.jsx';
export function WeekPlanModal({
  game,
  onStart
}) {
  return <><p className="modal-description">{dateLabel(game.week)} · 주요선택1 {game.major}</p><div className="week-review">{DAYS.map((day, index) => <div key={day}><span>{day}<small>요일</small></span><b>{game.plan[index] === 'science' ? game.major : ACTIVITIES[game.plan[index]].label}</b><p>{ACTIVITIES[game.plan[index]].place}</p><Check size={16} /></div>)}</div>
    <p className="info-note">현재 학습 능률 {Math.round(studyEfficiency(game.stats).value * 100)}%. 활동 순서에 따라 컨디션이 변하고, 같은 공부를 3회 이상 반복하면 증가량이 줄어요. 일요일은 자동 휴식이에요.</p>
    <button className="primary full-width" onClick={onStart}>이 계획으로 시작 <Play size={16} /></button></>;
}
export function StoryModal({
  game,
  onChoose
}) {
  const story = storyForWeek(game.week);
  const [busy, setBusy] = useState(false);
  return <article className="story-scene"><span className="soft-tag">WEEK {game.week + 1} · {story.speaker}</span><h3>{story.title}</h3><p>{story.text}</p>
    <div className="story-choices">{story.choices.map((choice, index) => <button key={choice.label} className="story-choice" disabled={busy} onClick={() => {
        setBusy(true);
        onChoose(index);
      }}><b>{choice.label}</b><small>{formatEffect(choice.effect)}</small></button>)}</div>
    <p className="muted">선택하면 이번 주 활동과 사건이 함께 반영돼요.</p>
  </article>;
}
export function WeekResultModal({
  entry,
  stats,
  ended,
  onClose
}) {
  const [tab, setTab] = useState('days');
  return <>{ended && <div className="ending-card"><span className="eyebrow">SEMESTER COMPLETE</span><h3>{endingFor(stats)}</h3><p>12주 동안 쌓아온 작은 선택들이 지금의 나를 만들었어.</p></div>}
    {entry.story && <article className="story-result"><span className="soft-tag">이번 주 이야기</span><h3>{entry.story.title}</h3><p>{entry.story.outcome}</p></article>}
    <div className="auth-tabs" role="group" aria-label="결과 보기">{[['days', '하루씩 돌아보기'], ['stats', '스탯 변화'], ['money', '용돈 정산']].map(([id, label]) => <button key={id} aria-pressed={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === 'days' && <div className="daily-log">{entry.daily?.map(day => <article key={day.day}><span>{day.day}</span><div><b>{day.label}</b><p>{day.summary}</p></div></article>)}</div>}
    {tab === 'stats' && <div className="result-list">{ACTIVE_STATS.map(({
        key,
        label
      }) => <div className="result-row" key={key}><span>{key === 'science' ? entry.major : label}</span><span className="result-values">{stats[key] - entry.delta[key]} → {stats[key]}</span><DeltaChip statKey={key} value={entry.delta[key]} /></div>)}</div>}
    {tab === 'money' && entry.economy && <div className="money-log">{[['allowance', '기본 용돈'], ['reward', '주간 목표 보상'], ['bonus', '평판 추가 용돈'], ['fine', '규칙 위반 벌금'], ['net', '이번 주 합계']].map(([key, label]) => <div key={key}><span>{label}</span><b>{key === 'fine' ? '-' : '+'}{entry.economy[key].toLocaleString('ko-KR')}원</b></div>)}</div>}
    {entry.assessment != null && <div className="assessment">모의 평가 <b>{entry.assessment} / 100</b></div>}
    {entry.notes.length > 0 && <ul className="result-notes">{entry.notes.map(note => <li key={note}>{note}</li>)}</ul>}
    <button className="primary full-width" onClick={onClose}>{ended ? '학기 마무리' : '다음 주 준비하기'} <Check size={16} /></button>
  </>;
}
