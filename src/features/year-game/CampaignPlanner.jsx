import { useState } from 'react';
import { courses, DAYS } from '../../domain/catalog.js';
export default function CampaignPlanner({ state, day, busy, send }) {
  const [name, setName] = useState('내 주간 계획');
  const c = state.campaign,
    night = c.nights[day];
  const locked =
    busy ||
    state.week > 40 ||
    Boolean(state.ending) ||
    (state.weekRun && day <= state.weekRun.closedDay) ||
    (state.week === 12 && state.courses.includes('general_biology') && day >= 4);
  return (
    <div className="campaign-planner">
      <label>
        연장 자습 · {DAYS[day]} 23:00
        <select
          aria-label="연장 자습"
          disabled={locked}
          value={night.activity === 'sleep' ? 'sleep' : night.target}
          onChange={(e) =>
            send({
              type: 'night_plan',
              day,
              activity: e.target.value === 'sleep' ? 'sleep' : 'study',
              target: e.target.value === 'sleep' ? null : e.target.value,
            })
          }
        >
          <option value="sleep">잠자기</option>
          {state.courses.map((id) => (
            <option key={id} value={id}>
              {courses[id].name} 공부
            </option>
          ))}
        </select>
      </label>
      {night.activity === 'study' && <small>다음 날 아침 자습 늦잠 확률 50%</small>}
      <details>
        <summary>내 프리셋</summary>
        <input
          aria-label="프리셋 이름"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
        />
        {[0, 1, 2].map((slot) => (
          <div className="saved-preset" key={slot}>
            <span>{c.presets[slot]?.name ?? `빈 슬롯 ${slot + 1}`}</span>
            <button
              disabled={busy || !name.trim()}
              onClick={() => send({ type: 'save_preset', slot, name })}
            >
              저장
            </button>
            <button
              disabled={busy || !c.presets[slot] || state.week > 40}
              onClick={() => send({ type: 'load_preset', slot })}
            >
              적용
            </button>
          </div>
        ))}
      </details>
    </div>
  );
}
