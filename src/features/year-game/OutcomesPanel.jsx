import { lifeOutcome } from '../../domain/campaign-outcomes.js';
import { ENDINGS, endingAvailable } from '../../domain/endings.js';
export default function OutcomesPanel({ state, busy, onEnding }) {
  return (
    <section className="outcomes">
      <h3>수고하셨습니다</h3>
      <p>{lifeOutcome(state)}</p>
      {state.admissions.map((a, i) => (
        <p key={i}>
          <b>{a.name}</b> · {a.exam ? `${a.grade ?? '미응시'}등급` : a.accepted ? '합격' : '불합격'}{' '}
          · {a.score}점{a.department && <span> · {a.department}</span>}
          <small className="result-reason">{a.reason}</small>
        </p>
      ))}
      {state.week > 40 &&
        Object.entries(ENDINGS)
          .filter(([id]) => endingAvailable(state, id))
          .map(([id, e]) => (
            <button className="choice-row" key={id} disabled={busy} onClick={() => onEnding(id)}>
              {e.title}
            </button>
          ))}
    </section>
  );
}
