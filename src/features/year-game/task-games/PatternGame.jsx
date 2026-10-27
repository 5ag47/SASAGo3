export default function PatternGame({ data, busy, onAction }) {
  const preview = data.phase === 'preview';
  const lit = preview ? data.goal : data.selected;
  return (
    <>
      <p>{preview ? '켜진 네 칸을 기억하세요.' : '기억한 네 칸을 골라 주세요.'}</p>
      <div className="task-pattern-grid">
        {Array.from({ length: 9 }, (_, cell) => (
          <button
            key={cell}
            aria-label={`${Math.floor(cell / 3) + 1}행 ${(cell % 3) + 1}열`}
            aria-pressed={lit.includes(cell)}
            className={lit.includes(cell) ? 'lit' : ''}
            disabled={busy || preview}
            onClick={() => onAction({ type: 'toggle', cell })}
          >
            {lit.includes(cell) ? '●' : '·'}
          </button>
        ))}
      </div>
      <p role="status">
        {preview ? '패턴 확인 중' : `${data.selected.length} / 4칸 선택`} · 실수 {data.mistakes}회
      </p>
      <button
        className="primary full"
        disabled={busy || (!preview && data.selected.length !== 4)}
        onClick={() => onAction({ type: preview ? 'ready' : 'check' })}
      >
        {preview ? '기억했어요' : '확인'}
      </button>
    </>
  );
}
