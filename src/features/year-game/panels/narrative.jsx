import { ChevronRight } from 'lucide-react';
import { choiceDeadline, events } from '../../../domain/catalog.js';
import { availableChapters } from '../../../domain/story.js';
import StoryPanel from '../StoryPanel.jsx';
import EventDialog from '../EventDialog.jsx';
import { NoticesPanel, RecordsPanel, WeekResult } from '../RecordPanels.jsx';
import { tutorialOpen, TUTORIAL_UNTIL } from '../tutorial.js';
export default function NarrativePanels(context) {
  const { state, modal, tutorial, ui } = context;
  const { busy, send } = context.game;
  const { choose, close, open, openEvent, continueWeek, setModal } = ui;
  return (
    <>
      {modal.type === 'events' && (
        <EventDialog
          key={modal.eventId ?? state.pending[0] ?? 'empty'}
          state={state}
          eventId={modal.eventId}
          busy={busy}
          onChoose={choose}
          onDone={close}
        />
      )}
      {modal.type === 'records' && (
        <RecordsPanel
          state={state}
          onRead={tutorial.readResult}
          onStory={(chapterId) => setModal({ type: 'story', chapterId })}
        />
      )}
      {modal.type === 'story' &&
        availableChapters(state).some((chapter) => chapter.id === modal.chapterId) && (
          <StoryPanel
            key={modal.chapterId}
            state={state}
            chapter={availableChapters(state).find((chapter) => chapter.id === modal.chapterId)}
            busy={busy}
            onProgress={(action) => send({ type: 'story', chapter: modal.chapterId, action })}
            onNavigate={open}
            onClose={close}
          />
        )}
      {modal.type === 'notices' && (
        <>
          {state.week >= 37 && (
            <button className="primary full" onClick={() => open('admissions')}>
              입시 결과 · 결말 선택
            </button>
          )}
          {state.pending.length > 0 && (
            <div className="pending-notices">
              {state.pending.map((id) => (
                <button key={id} onClick={() => openEvent(id)}>
                  <span>
                    <b>{events[id].name}</b>
                    <small>
                      {choiceDeadline(id) === state.week
                        ? '이번 주 마감'
                        : `${choiceDeadline(id) - state.week}주 남음`}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          )}
          <NoticesPanel
            state={state}
            onStory={(chapterId) => setModal({ type: 'story', chapterId })}
            onReview={openEvent}
            onTask={(taskId) => setModal({ type: 'tasks', taskId })}
          />
        </>
      )}
      {modal.type === 'result' && state.history.at(-1) && (
        <WeekResult
          entry={state.history.at(-1)}
          character={state.character}
          onContinue={continueWeek}
          onRead={tutorial.readResult}
        >
          {tutorialOpen(state, tutorial.count, tutorial.total) && (
            <div className="tutorial-recap">
              <b>
                연습 {tutorial.count}/{tutorial.total}
                {tutorial.count < tutorial.total && ` · 남은 단원은 ${TUTORIAL_UNTIL}까지`}
              </b>
              <button className="subtle" onClick={() => open('tutorial')}>
                {tutorial.count < tutorial.total ? '남은 단원 이어하기' : '연습 내용 다시 보기'}
              </button>
            </div>
          )}
        </WeekResult>
      )}
    </>
  );
}
