import { activities, courses, DAYS } from '../../../domain/catalog.js';
import { effectivePlan, lockedSlots } from '../../../domain/week.js';
import { nightLocked } from '../../../domain/schedule.js';
import WeekReviewPanel from '../WeekReviewPanel.jsx';
import { tutorialOpen } from '../tutorial.js';
import DayCopy from '../DayCopy.jsx';
import WeekRunPanel from '../WeekRunPanel.jsx';
import ActivityPicker from '../ActivityPicker.jsx';
import { ActivityIcon, activityName, SESSIONS } from '../ui.jsx';
export default function PlanningPanels(context) {
  const { state, modal, tutorial, ui } = context;
  const { busy, send, notify } = context.game;
  const { copyDay, slot, assign, close, advance, open, openEvent, setModal } = ui;
  return (
    <>
      {modal.type === 'slot' && (
        <ActivityPicker
          key={modal.index}
          state={state}
          index={modal.index}
          busy={busy}
          onApply={async (activity, target) => {
            if (await send({ type: 'plan', index: modal.index, activity, target })) {
              close();
              notify('신청했습니다.');
            }
          }}
        />
      )}
      {modal.type === 'schedule' && (
        <>
          <DayCopy state={state} busy={busy} onCopy={copyDay} />
          <div className="weekly-overview">
            {DAYS.map((day, d) => (
              <div key={day}>
                <h3>{day}</h3>
                {[0, 1, 2].map((session) => {
                  const index = d * 3 + session;
                  const selected = effectivePlan(state)[index];
                  return (
                    <button
                      key={session}
                      className={activities[selected.activity].color}
                      onClick={() => slot(index)}
                      disabled={
                        busy ||
                        Boolean(lockedSlots(state)[index]) ||
                        state.week > 40 ||
                        Boolean(state.ending)
                      }
                    >
                      <small>{SESSIONS[session]}</small>
                      <ActivityIcon id={selected.activity} />
                      <b>{activityName(selected.activity)}</b>
                      {selected.activity === 'study' && <em>{courses[selected.target]?.short}</em>}
                      {selected.activity === 'task' && (
                        <em>{state.tasks[selected.target]?.name}</em>
                      )}
                    </button>
                  );
                })}
                <label className="night-overview">
                  연장
                  <select
                    aria-label={`${day} 연장 자습`}
                    disabled={
                      busy ||
                      state.week > 40 ||
                      Boolean(state.ending) ||
                      Boolean(nightLocked(state, d))
                    }
                    value={
                      state.campaign.nights[d].activity === 'sleep'
                        ? 'sleep'
                        : state.campaign.nights[d].target
                    }
                    onChange={(e) =>
                      send({
                        type: 'night_plan',
                        day: d,
                        activity: e.target.value === 'sleep' ? 'sleep' : 'study',
                        target: e.target.value === 'sleep' ? null : e.target.value,
                      })
                    }
                  >
                    <option value="sleep">잠자기</option>
                    {state.courses.map((id) => (
                      <option key={id} value={id}>
                        {courses[id].short}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </>
      )}
      {modal.type === 'running' && (
        <WeekRunPanel
          state={state}
          busy={busy}
          onContinue={() => advance()}
          onTask={() =>
            setModal({
              type: state.weekRun.waiting.kind === 'task' ? 'taskGame' : 'tasks',
              taskId: state.weekRun.waiting.task,
            })
          }
          onEvent={openEvent}
          onSkip={() => advance(true)}
        />
      )}
      {modal.type === 'confirm' && (
        <WeekReviewPanel
          state={state}
          busy={busy}
          tutorialLeft={
            tutorialOpen(state, tutorial.count, tutorial.total)
              ? tutorial.total - tutorial.count
              : 0
          }
          onStart={() => advance()}
          onTaskGame={(taskId) => setModal({ type: 'taskGame', taskId })}
          onSchedule={() => open('schedule')}
          onTask={assign}
          onNotices={() => open('notices')}
        />
      )}
    </>
  );
}
