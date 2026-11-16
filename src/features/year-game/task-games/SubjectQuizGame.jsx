export default function SubjectQuizGame({ data, busy, onAction }) {
  const q = data.questions[Math.min(data.index, 2)];
  return (
    <div className="subject-quiz">
      <small>{Math.min(3, data.index + 1)} / 3문제</small>
      <h3>{q.prompt}</h3>
      {q.options.map((text, i) => (
        <button
          key={i}
          className="choice-row"
          disabled={busy || data.passed || q.hidden.includes(i)}
          onClick={() => onAction({ type: 'answer', answer: i })}
        >
          {i + 1}. {q.hidden.includes(i) ? '제외한 오답' : text}
        </button>
      ))}
    </div>
  );
}
