import { useEffect, useRef } from 'react';
import { characterImage, dayRoom, nightRoom } from '../../assets.js';
import EventDialog from './EventDialog.jsx';
export default function EventScene({ state, busy, night, eventId, onChoose, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="event-stage"
      aria-label="새로운 이야기"
      onCancel={(event) => event.preventDefault()}
      style={{ '--event-bg': `url("${night ? nightRoom : dayRoom}")` }}
    >
      <div className="event-scene-art">
        <span>한 해의 이야기</span>
        <img src={characterImage(state.character)} alt="" />
      </div>
      <section className="event-dialogue">
        <span className="speaker-name">{state.name}</span>
        <EventDialog
          key={eventId}
          state={state}
          busy={busy}
          eventId={eventId}
          onChoose={onChoose}
          onDone={onDone}
        />
      </section>
    </dialog>
  );
}
