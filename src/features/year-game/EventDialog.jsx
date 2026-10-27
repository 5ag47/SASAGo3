import { useState } from 'react';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import { events, quizzes } from '../../domain/catalog.js';
import { choiceOptions, INTERVIEW_QUESTIONS } from '../../domain/choices.js';
import { ChoiceButton, Empty } from './ui.jsx';
export default function EventDialog({ state, busy, onChoose, eventId }) {
  const [answers, setAnswers] = useState([]);
  const id = eventId ?? state.pending[0];
  const event = state.pending.includes(id) ? events[id] : null;
  if (!event) return <Empty>지금은 결정할 새 소식이 없어요.</Empty>;
  if (event.kind === 'interview') {
    const question = INTERVIEW_QUESTIONS[answers.length];
    if (!question)
      return (
        <>
          <span className="event-kicker">
            <MessageCircle size={14} /> 면접 답변 완료
          </span>
          <h3 className="event-title">면접 종료</h3>
          <button
            className="primary full"
            disabled={busy}
            onClick={() => onChoose({ event: id, answers })}
          >
            결과 확인 <ArrowRight size={16} />
          </button>
        </>
      );
    return (
      <>
        <span className="event-kicker">
          <MessageCircle size={14} /> 실전 면접 · 질문 {answers.length + 1} / 3
        </span>
        <h3 className="event-title">{question.text}</h3>
        <div className="choices">
          {question.options.map((option, index) => (
            <ChoiceButton
              key={option}
              title={option}
              description="나의 답변 선택하기"
              onClick={() => setAnswers((a) => [...a, index])}
            />
          ))}
        </div>
        <p className="fine-print">면접은 정답뿐 아니라 정직함·설명·협업 태도도 살펴봐요.</p>
      </>
    );
  }
  return (
    <>
      <span className="event-kicker">
        <Sparkles size={14} /> 새로운 이야기 · {state.pending.length}개의 소식
      </span>
      <h3 className="event-title">{event.name}</h3>
      <p className="dialog-lead">
        {event.kind === 'quiz' ? quizzes[event.quiz].question : event.description}
      </p>
      <div className="choices">
        {choiceOptions(state, id).map((option) => (
          <ChoiceButton
            key={option.id}
            title={option.label}
            description={option.detail}
            onClick={() => onChoose({ event: id, option: option.id })}
            disabled={busy || state.money < (option.cost ?? 0)}
          />
        ))}
      </div>
    </>
  );
}
