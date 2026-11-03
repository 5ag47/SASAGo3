export default function OrderGame({ data, busy, onAction }) {
  const picked = [...data.cards].sort((a, b) => a - b).slice(0, data.index);
  return (
    <>
      <p>작은 숫자부터 차례로 고르세요.</p>
      <div className="task-order-cards">
        {data.cards.map((card) => (
          <button
            key={card}
            disabled={busy || picked.includes(card)}
            className={picked.includes(card) ? 'picked' : ''}
            onClick={() => onAction({ type: 'pick', card })}
          >
            {card}
          </button>
        ))}
      </div>
      <p role="status">
        {data.index} / {data.cards.length} · 실수 {data.mistakes}회
      </p>
    </>
  );
}
