import { useState } from 'react';
import { Copy } from 'lucide-react';
import { DAYS } from '../../domain/catalog.js';
import { copyDayPreview } from '../../domain/schedule.js';
import './day-copy.css';

export default function DayCopy({ state, busy, onCopy, sourceDay }) {
  const [expanded, setExpanded] = useState(false);
  const [source, setSource] = useState(0);
  const [days, setDays] = useState([]);
  const from = sourceDay ?? source;
  const selected = days.filter((day) => day !== from);
  const preview = copyDayPreview(state, from, selected);
  const count = preview.reduce((sum, day) => sum + day.indices.length, 0);
  const closed = state.week > 40 || Boolean(state.ending);
  return (
    <div className="day-copy">
      <button
        className="day-copy-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        disabled={closed}
      >
        <Copy size={14} />{' '}
        {sourceDay === undefined ? '요일 일정 복사' : `${DAYS[from]}요일 일정 복사`}
      </button>
      {expanded && (
        <div className="day-copy-body">
          {sourceDay === undefined && (
            <label className="day-copy-source">
              복사할 요일
              <select
                value={from}
                disabled={busy}
                onChange={(event) => setSource(Number(event.target.value))}
              >
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}요일
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset disabled={busy}>
            <legend>{DAYS[from]}요일과 같은 일정으로 바꿀 요일</legend>
            <div className="day-copy-targets">
              {DAYS.map((day, index) =>
                index === from ? null : (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={selected.includes(index)}
                      onChange={(event) =>
                        setDays(
                          event.target.checked
                            ? [...selected, index]
                            : selected.filter((value) => value !== index),
                        )
                      }
                    />
                    {day}
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <p>고정 수업·행사가 있는 칸은 복사하지 않습니다.</p>
          <button
            className="primary full"
            disabled={busy || !count || closed}
            onClick={async () => {
              if (await onCopy(from, selected)) {
                setDays([]);
                setExpanded(false);
              }
            }}
          >
            {selected.length ? `${selected.length}일 · ${count}칸에 적용` : '받을 요일 선택'}
          </button>
        </div>
      )}
    </div>
  );
}
