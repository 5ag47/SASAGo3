import { useState } from 'react';

export default function ExperimentGame({ data, busy, onAction }) {
  const [chosen, setChosen] = useState([]);
  const toggle = (index) =>
    setChosen((list) =>
      list.includes(index) ? list.filter((item) => item !== index) : [...list, index].slice(-2),
    );
  return (
    <>
      <p>바꿀 조건을 골라 실험하고, 결과를 바꾸는 원인을 찾으세요.</p>
      <div className="task-experiment-vars">
        {data.variables.map((label, index) => (
          <button
            key={label}
            aria-pressed={chosen.includes(index)}
            className={[
              chosen.includes(index) ? 'chosen' : '',
              data.ruledOut.includes(index) ? 'ruled-out' : '',
            ].join(' ')}
            disabled={busy}
            onClick={() => toggle(index)}
          >
            {label}
            {data.ruledOut.includes(index) && <small>영향 없음</small>}
          </button>
        ))}
      </div>
      <div className="task-experiment-actions">
        <button
          className="subtle"
          disabled={busy || !chosen.length}
          onClick={() => {
            onAction({ type: 'test', vars: [...chosen].sort() });
            setChosen([]);
          }}
        >
          {chosen.length > 1 ? '두 조건 함께 바꿔 실험' : '이 조건만 바꿔 실험'}
        </button>
        <button
          className="primary"
          disabled={busy || chosen.length !== 1}
          onClick={() => {
            onAction({ type: 'answer', variable: chosen[0] });
            setChosen([]);
          }}
        >
          이게 원인이다
        </button>
      </div>
      <ul className="task-experiment-log" aria-label="실험 기록">
        {data.tests.map((test, i) => (
          <li key={i} className={test.vars.length > 1 ? 'uncontrolled' : ''}>
            {test.vars.map((index) => data.variables[index]).join(' + ')} 변경 →{' '}
            <b>{test.changed ? '결과 달라짐' : '변화 없음'}</b>
            {test.vars.length > 1 && (
              <small>
                {test.changed ? ' · 무엇 때문인지 알 수 없음' : ' · 한 번에 하나씩 바꿔야 해요'}
              </small>
            )}
          </li>
        ))}
      </ul>
      <p role="status">
        실험 {data.tests.length}회 · 실수 {data.mistakes}회
      </p>
    </>
  );
}
