import { MessageCircle, Check, Minus } from 'lucide-react';
import { INTERVIEW_QUESTIONS } from '../../domain/interview.js';
import { ChoiceButton } from './ui.jsx';
import './minigames.css';

export default function InterviewPanel({ game, busy, onAnswer, onDone }) {
  const answers = game?.answers ?? [];
  const finished = game?.phase === 'finished';
  const abandoned = game?.phase === 'abandoned';
  const question = INTERVIEW_QUESTIONS[answers.length];
  return (
    <section className="interview-game">
      <span className="event-kicker">
        <MessageCircle size={14} /> 실전 면접{' '}
        {finished
          ? '결과'
          : abandoned
            ? '기한 종료'
            : `· 질문 ${answers.length + 1} / ${INTERVIEW_QUESTIONS.length}`}
      </span>
      {finished || abandoned ? (
        <>
          <h3 className="event-title">{finished ? `${game.score}점` : '면접이 종료되었습니다.'}</h3>
          <ol className="interview-review">
            {answers.map((answer, index) => {
              const question = INTERVIEW_QUESTIONS[index];
              const good = answer === question.correct;
              return (
                <li key={question.text}>
                  <b>
                    {good ? <Check size={16} /> : <Minus size={16} />} 질문 {index + 1} ·{' '}
                    {good ? '적절한 답변' : '다시 살펴보기'}
                  </b>
                  <p>{question.text}</p>
                  <span>내 답변 · {question.options[answer]}</span>
                  <p>{question.explanation}</p>
                </li>
              );
            })}
          </ol>
          <button className="primary full" onClick={onDone}>
            확인
          </button>
        </>
      ) : (
        <>
          <div className="interview-progress" aria-label={`${answers.length}개 답변 완료`}>
            {INTERVIEW_QUESTIONS.map((_, index) => (
              <i
                key={index}
                className={
                  index < answers.length ? 'done' : index === answers.length ? 'current' : ''
                }
              />
            ))}
          </div>
          <h3 className="event-title">{question.text}</h3>
          <div className="choices">
            {question.options.map((option, index) => (
              <ChoiceButton
                key={option}
                title={option}
                disabled={busy}
                onClick={() => onAnswer(index)}
              />
            ))}
          </div>
          {answers.length > 0 && (
            <p className="minigame-status" role="status">
              {answers.length}개 답변 완료
            </p>
          )}
        </>
      )}
    </section>
  );
}
