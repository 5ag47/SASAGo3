import { Check, Play } from 'lucide-react';
import { ACTIVITIES, DAYS } from '../../data/activities.js';
import { STATS } from '../../data/stats.js';
import { dateLabel } from '../../game.js';
import DeltaChip from '../DeltaChip.jsx';

export function WeekPlanModal({ game, onStart }) {
  return (
    <>
      <p className="modal-description">{dateLabel(game.week)} 계획</p>
      <div className="week-review">
        {DAYS.map((day, index) => (
          <div key={day}>
            <span>{day}<small>요일</small></span>
            <b>{ACTIVITIES[game.plan[index]].label}</b>
            <p>{ACTIVITIES[game.plan[index]].place}</p>
            <Check size={16} />
          </div>
        ))}
      </div>
      <p className="info-note">
        시작하면 월~토 활동이 순서대로 반영되고, 일요일은 자동으로 휴식해요. 이미 지난 주는 되돌릴 수 없어요.
      </p>
      <button className="primary full-width" onClick={onStart}>한 주 시작 <Play size={16} fill="currentColor" /></button>
    </>
  );
}

export function WeekResultModal({ entry, stats, onClose }) {
  return (
    <>
      <p className="modal-description">{entry.plan.map(id => ACTIVITIES[id].label).join(' · ')}</p>
      <div className="result-list">
        {STATS.map(({ key, label }) => (
          <div className="result-row" key={key}>
            <span>{label}</span>
            <span className="result-values">{stats[key] - entry.delta[key]} → {stats[key]}</span>
            <DeltaChip statKey={key} value={entry.delta[key]} />
          </div>
        ))}
      </div>
      {entry.notes.length > 0 && <ul className="result-notes">{entry.notes.map(note => <li key={note}>{note}</li>)}</ul>}
      <button className="primary full-width" onClick={onClose}>확인 <Check size={16} /></button>
    </>
  );
}
