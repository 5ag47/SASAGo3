import { reportCardLabel, REPORT_LAYOUTS } from '../../../domain/task-modules/report-v1.js';

export default function ReportGame({ data, busy, onAction }) {
  const sections = REPORT_LAYOUTS[data.layout].sections;
  const done = Array.from({ length: data.placed }, (_, i) => `s${i}`);
  return (
    <>
      <p>
        {data.layout === 'presentation' ? '발표' : '보고서'} 목차의 다음 부분을 고르세요. 넣으면 안
        되는 카드도 섞여 있어요.
      </p>
      <ol className="task-report-outline" aria-label="완성된 목차">
        {sections.map((label, i) => (
          <li key={label} className={i < data.placed ? 'filled' : i === data.placed ? 'next' : ''}>
            {i < data.placed ? label : i === data.placed ? '다음 부분' : '　'}
          </li>
        ))}
      </ol>
      <div className="task-report-cards">
        {data.deck
          .filter((code) => !done.includes(code))
          .map((code) => (
            <button
              key={code}
              disabled={busy}
              onClick={() => onAction({ type: 'pick', card: code })}
            >
              {reportCardLabel(data.layout, code)}
            </button>
          ))}
      </div>
      <p role="status">
        {data.placed} / {sections.length} · 실수 {data.mistakes}회
      </p>
    </>
  );
}
