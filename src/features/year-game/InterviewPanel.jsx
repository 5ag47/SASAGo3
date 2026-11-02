import { MessageCircle, Check, Minus } from 'lucide-react';
import {
  answerFeedback,
  answerPoints,
  INTERVIEW_QUESTIONS,
  interviewSpec,
  interviewView,
} from '../../domain/interview.js';
import { ChoiceButton } from './ui.jsx';
import './minigames.css';

// Questions come from the student's own record. Interviews answered before 2026.11 keep
// their original fixed questions so the review still matches what was asked.
function questionsFor(state, game) {
  if (game && !game.questions) return { legacy: true, spec: null, views: INTERVIEW_QUESTIONS };
  const spec = game?.questions ?? interviewSpec(state);
  return { legacy: false, spec, views: interviewView(spec) };
}

export default function InterviewPanel({ state, game, busy, onAnswer, onDone }) {
  const answers = game?.answers ?? [];
  const finished = game?.phase === 'finished';
  const abandoned = game?.phase === 'abandoned';
  const { legacy, spec, views } = questionsFor(state, game);
  const question = views[answers.length];
  return (
    <section className="interview-game">
      <span className="event-kicker">
        <MessageCircle size={14} /> 실전 면접{' '}
        {finished
          ? '결과'
          : abandoned
            ? '기한 종료'
            : `· 질문 ${answers.length + 1} / ${views.length}`}
      </span>
      {finished || abandoned ? (
        <>
          <h3 className="event-title">{finished ? `${game.score}점` : '면접이 종료되었습니다.'}</h3>
          <ol className="interview-review">
            {answers.map((answer, index) => {
              const view = views[index];
              const good = legacy
                ? answer === view.correct
                : answerPoints(spec[index], answer) >= 0.8;
              return (
                <li key={view.text}>
                  <b>
                    {good ? <Check size={16} /> : <Minus size={16} />} 질문 {index + 1} ·{' '}
                    {good ? '좋은 답변' : '다시 살펴보기'}
                  </b>
                  <p>{view.text}</p>
                  <span>내 답변 · {view.options[answer]}</span>
                  <p>{legacy ? view.explanation : answerFeedback(spec[index], answer)}</p>
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
            {views.map((_, index) => (
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
