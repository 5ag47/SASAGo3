import { useState } from 'react';
import { ArrowRight, CalendarDays, LockKeyhole, Play, WandSparkles, X } from 'lucide-react';
import { activities, activeTasks, courses, DAYS } from '../../domain/catalog.js';
import { effectivePlan, lockedSlots } from '../../domain/schedule.js';
import { activityLock } from '../../domain/senior-year.js';
import { taskEstimate } from '../../domain/task-modules/registry.js';
import { weekForecast } from '../../domain/week-forecast.js';
import { ActivityIcon, activityName, SESSIONS } from './ui.jsx';
import CampaignPlanner from './CampaignPlanner.jsx';

export default function Planner({
  state,
  busy,
  send,
  onPreset,
  onStart,
  onWeek,
  assignment,
  cancelAssignment,
  onClose,
}) {
  const [selected, setSelected] = useState(1);
  const [course, setCourse] = useState(state.courses[0]);
  const [extra, setExtra] = useState('teacher');
  const plan = effectivePlan(state),
    locked = lockedSlots(state);
  const tasks = activeTasks(state).sort((a, b) => a.deadline - b.deadline);
  const forecast = state.week <= 40 ? weekForecast(state) : null;
  const disabled = busy || Boolean(state.ending) || state.week > 40;
  const eligible = (index, activity) =>
    !locked[index] &&
    (activity === 'skip' ? index % 3 === 0 : index % 3 !== 0 || activity === 'study');
  async function place(activity, target = null, from = selected) {
    const order = Array.from({ length: 21 }, (_, i) => (from + i) % 21);
    const index = order.find((i) => eligible(i, activity));
    if (index === undefined) return;
    const next = await send({ type: 'plan', index, activity, target });
    if (next) {
      setSelected(
        Array.from({ length: 21 }, (_, i) => (index + i + 1) % 21).find((i) =>
          eligible(i, activity),
        ) ?? index,
      );
      cancelAssignment?.();
    }
  }
  function placeTask(task, from) {
    return task.special === 'tutorial'
      ? place(
          'study',
          state.courses.find((id) => courses[id].ability === 'math'),
          from,
        )
      : place(task.special === 'clean' ? 'clean' : 'task', task.id, from);
  }
  const chosenCourse = state.courses.includes(course) ? course : state.courses[0];
  return (
    <aside className="planner-panel weekly-planner" aria-label="주간 시간표 편집">
      <header>
        <div>
          <span className="planner-eyebrow">MY WEEK</span>
          <h2>
            <CalendarDays size={22} /> 이번 주 시간표
          </h2>
        </div>
        <button
          className="auto-plan-button"
          disabled={disabled}
          onClick={() => onPreset('balanced')}
        >
          <WandSparkles size={17} /> 자동 배정
        </button>
        <button className="planner-close icon-button" onClick={onClose} aria-label="자습 신청 닫기">
          <X size={18} />
        </button>
      </header>
      <p className="planner-instruction" aria-live="polite">
        {assignment
          ? '넣을 시간 칸을 선택하세요.'
          : `${DAYS[Math.floor(selected / 3)]}요일 ${SESSIONS[selected % 3]} 선택 중 · 할 일을 누르면 바로 배정됩니다.`}
      </p>
      <div className="planning-workspace">
        <div className="week-grid-wrap" data-tutorial="schedule">
          <div className="week-grid" role="group" aria-label="일주일 시간표">
            <span className="grid-corner">시간</span>
            {DAYS.map((day) => (
              <b className="grid-day" key={day}>
                {day}
              </b>
            ))}
            {SESSIONS.map((label, session) => (
              <div className="grid-row" key={label}>
                <span className="grid-time">{label}</span>
                {DAYS.map((day, d) => {
                  const index = d * 3 + session,
                    slot = plan[index];
                  return (
                    <button
                      key={day}
                      className={`week-cell ${activities[slot.activity].color} ${selected === index ? 'selected' : ''}`}
                      aria-pressed={selected === index}
                      aria-label={`${day}요일 ${label} ${activityName(slot.activity)} ${slot.activity === 'task' ? state.tasks[slot.target]?.name : slot.activity === 'study' ? courses[slot.target]?.name : ''}`}
                      disabled={disabled || Boolean(locked[index])}
                      onClick={() =>
                        assignment ? placeTask(state.tasks[assignment], index) : setSelected(index)
                      }
                    >
                      {locked[index] ? (
                        <LockKeyhole size={14} />
                      ) : (
                        <ActivityIcon id={slot.activity} size={18} />
                      )}
                      <b>
                        {slot.activity === 'study'
                          ? courses[slot.target]?.short
                          : activityName(slot.activity)}
                      </b>
                      <small>
                        {slot.activity === 'task'
                          ? state.tasks[slot.target]?.name
                          : locked[index]
                            ? '고정'
                            : ''}
                      </small>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="grid-help">
            배정 후 다음 칸으로 이동해요. 바꾸고 싶은 칸을 눌러 언제든 수정하세요.
          </p>
          <details className="planner-extra">
            <summary>연장 자습 · 저장한 시간표</summary>
            <CampaignPlanner state={state} day={Math.floor(selected / 3)} busy={busy} send={send} />
          </details>
        </div>
        <div className="plan-palette" data-tutorial="tasks">
          <h3>
            할 일 <span>{tasks.length}</span>
          </h3>
          <div className="palette-tasks">
            {tasks.map((task) => (
              <button
                key={task.id}
                disabled={
                  disabled ||
                  !plan.some((_, i) => eligible(i, task.special === 'tutorial' ? 'study' : 'task'))
                }
                className="palette-task"
                onClick={() => placeTask(task)}
              >
                <span>
                  <b>{task.name}</b>
                  <small>
                    {task.deadline === state.week
                      ? '이번 주 마감'
                      : `${task.deadline - state.week}주 남음`}{' '}
                    · 남은 {taskEstimate(state, task)}칸
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            {!tasks.length && <p className="palette-empty">할 일을 모두 마쳤어요!</p>}
          </div>
          <label className="palette-course">
            공부할 과목
            <select
              aria-label="공부할 과목"
              value={chosenCourse}
              onChange={(e) => setCourse(e.target.value)}
            >
              {state.courses.map((id) => (
                <option key={id} value={id}>
                  {courses[id].name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="palette-study"
            disabled={disabled}
            onClick={() => place('study', chosenCourse)}
          >
            <ActivityIcon id="study" /> 공부 배정 <ArrowRight size={15} />
          </button>
          <div className="palette-rest" data-tutorial="slot">
            {['sleep', 'exercise', 'game'].map((id) => (
              <button key={id} disabled={disabled} onClick={() => place(id)}>
                <ActivityIcon id={id} />
                {id === 'sleep' ? '휴식' : id === 'exercise' ? '운동' : '놀기'}
              </button>
            ))}
          </div>
          <details className="planner-extra">
            <summary>다른 활동</summary>
            <select aria-label="다른 활동" value={extra} onChange={(e) => setExtra(e.target.value)}>
              {Object.keys(activities)
                .filter(
                  (id) =>
                    !['club', 'field_trip', 'study', 'task', 'sleep', 'exercise', 'game'].includes(
                      id,
                    ),
                )
                .map((id) => (
                  <option key={id} value={id} disabled={Boolean(activityLock(state, id))}>
                    {activityName(id)}
                  </option>
                ))}
            </select>
            <button
              className="subtle"
              disabled={disabled || Boolean(activityLock(state, extra))}
              onClick={() => place(extra, extra === 'teacher' ? 'homeroom' : null)}
            >
              이 활동 배정
            </button>
          </details>
        </div>
      </div>
      <footer className="planner-bottom">
        <div>
          {forecast && (
            <p>
              주말 예상 <b>건강 {forecast.hp}</b> <b>스트레스 {forecast.stress}</b>
            </p>
          )}
          <button className="subtle" onClick={onWeek}>
            일정 크게 보기
          </button>
        </div>
        <button
          className="primary start-week"
          data-tutorial="confirm"
          disabled={busy || Boolean(state.ending)}
          onClick={onStart}
        >
          <Play size={18} fill="currentColor" />
          {state.week > 40 ? '나의 결말 선택' : state.weekRun ? '이어서 진행' : '한 주 시작'}
          <ArrowRight size={19} />
        </button>
      </footer>
    </aside>
  );
}
