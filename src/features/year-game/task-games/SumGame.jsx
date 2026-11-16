export default function SumGame({ data, busy, onAction }) {
  const total = data.selected.reduce((sum, card) => sum + card, 0);
  return (
    <>
      <p>
        소문항을 골라 총점 <b>{data.target}점</b>짜리 문제를 만드세요.
      </p>
      <div className="task-sum-cards">
        {data.cards.map((card) => (
          <button
            key={card}
            aria-pressed={data.selected.includes(card)}
            className={data.selected.includes(card) ? 'chosen' : ''}
            disabled={busy}
            onClick={() => onAction({ type: 'toggle', card })}
          >
            {card}
            <small>점</small>
          </button>
        ))}
      </div>
      <p role="status" className={total > data.target ? 'task-sum-over' : ''}>
        지금 {total} / {data.target}점 · 실수 {data.mistakes}회
      </p>
      <button
        className="primary full"
        disabled={busy || data.selected.length < 2}
        onClick={() => onAction({ type: 'check' })}
      >
        이 구성으로 제출
      </button>
    </>
  );
}
