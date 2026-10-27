import { Sparkles } from 'lucide-react';
import { events, quizzes } from '../../domain/catalog.js';
import { choiceOptions } from '../../domain/choices.js';
import { ChoiceButton, Empty } from './ui.jsx';
import InterviewPanel from './InterviewPanel.jsx';
import CardGamePanel from './CardGamePanel.jsx';
export default function EventDialog({ state, busy, onChoose, onDone, eventId }) {
  const id = eventId ?? state.pending[0];
  const savedGame =
    id === 'interview_day'
      ? state.minigames.interview
      : id === 'dorm_cards'
        ? state.minigames.cards
        : null;
  const event = state.pending.includes(id) || savedGame ? events[id] : null;
  if (!event) return <Empty>지금은 결정할 새 소식이 없어요.</Empty>;
  if (event.kind === 'interview')
    return (
      <InterviewPanel
        game={savedGame}
        busy={busy}
        onAnswer={(answer) => onChoose({ event: id, option: `answer:${answer}` })}
        onDone={onDone}
      />
    );
  if (id === 'dorm_cards' && savedGame)
    return (
      <CardGamePanel
        game={savedGame}
        busy={busy}
        onChoose={(option) => onChoose({ event: id, option })}
        onDone={onDone}
      />
    );
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
