import { useState } from 'react';
import { BookOpen, Check, Moon, Play, WandSparkles } from 'lucide-react';
import { activeTasks, activities, courses, DAYS, TEACHERS } from '../../domain/catalog.js';
import { effectivePlan, lockedSlots } from '../../domain/week.js';
import { nightLocked } from '../../domain/schedule.js';
import { activityLock } from '../../domain/senior-year.js';
import { taskEstimate } from '../../domain/task-modules/registry.js';
import { ActivityIcon, activityName } from './ui.jsx';

export default function Planner({ state, busy, send, onStart, onClose }) {
  const [selected, setSelected] = useState(1);
  const [tab, setTab] = useState('task');
  const [savedName, setSavedName] = useState('나의 시간표');
  const plan = effectivePlan(state);
  const locked = lockedSlots(state);
  const tasks = activeTasks(state).filter((t) => t.special !== 'tutorial');
  const closed = busy || state.week > 40 || Boolean(state.ending);
  const night = selected >= 21;
  const day = night ? selected - 21 : Math.floor(selected / 3);
  const session = night ? '연장' : ['아침', '1자', '2자'][selected % 3];
  const readOnly = (index) =>
    closed || (index >= 21 ? nightLocked(state, index - 21) : locked[index]);
  const available = (index, activity) =>
    !readOnly(index) &&
    (index >= 21
      ? ['study', 'sleep'].includes(activity)
      : index % 3 !== 0 || ['study', 'skip'].includes(activity));
  async function place(activity, target = null) {
    let index = selected;
    if (!available(index, activity))
      index = Array.from({ length: 21 }, (_, i) => (selected + i) % 21).find((i) =>
        available(i, activity),
      );
    if (index === undefined) return;
    const next = await send(
      index >= 21
        ? { type: 'night_plan', day: index - 21, activity, target }
        : { type: 'plan', index, activity, target },
    );
    if (!next) return;
    const candidates =
      index >= 21
        ? Array.from({ length: 7 }, (_, i) => 21 + ((index - 21 + i + 1) % 7))
        : Array.from({ length: 21 }, (_, i) => (index + i + 1) % 21);
    setSelected(candidates.find((i) => available(i, activity)) ?? index);
  }
  return (
    <section className="schedule-workspace" aria-label="자습 신청 시간표">
      <div className="schedule-top">
        <div className="preset-buttons" aria-label="자동 편성 기준">
          {[
            ['math', '수학 집중'],
            ['tasks', '할 일 우선'],
            ['rest', '회복 우선'],
          ].map(([preset, label]) => (
            <button key={preset} disabled={closed} onClick={() => send({ type: 'preset', preset })}>
              <WandSparkles size={18} />
              {label}
            </button>
          ))}
        </div>
        <span>칸 선택 → 오른쪽 버튼으로 배정</span>
      </div>
      <div className="schedule-layout">
        <div className="schedule-grid" role="group" aria-label="일주일 시간표">
          <span />
          {DAYS.map((d) => (
            <b className="schedule-day" key={d}>
              {d}
            </b>
          ))}
          {[0, 1, 2, 3].map((row) => (
            <div className="schedule-row" key={row}>
              <b className="schedule-time">{['아침', '1자', '2자', '연장'][row]}</b>
              {DAYS.map((d, dayIndex) => {
                const index = row === 3 ? 21 + dayIndex : dayIndex * 3 + row;
                const entry = row === 3 ? state.campaign.nights[dayIndex] : plan[index];
                const title =
                  entry.activity === 'study'
                    ? courses[entry.target]?.short
                    : entry.activity === 'task'
                      ? state.tasks[entry.target]?.name
                      : entry.activity === 'skip'
                        ? '불참'
                        : activityName(entry.activity);
                return (
                  <button
                    key={d}
                    className={`schedule-cell ${activities[entry.activity]?.color ?? ''} ${selected === index ? 'selected' : ''}`}
                    disabled={Boolean(readOnly(index))}
                    aria-pressed={selected === index}
                    aria-label={`${d}요일 ${['아침', '1자', '2자', '연장'][row]} ${title}`}
                    onClick={() => setSelected(index)}
                  >
                    <ActivityIcon id={entry.activity} size={21} />
                    <span>{title}</span>
                    {readOnly(index) && <small>확정</small>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <aside className="schedule-palette">
          <h3>
            {DAYS[day]}요일 {session} <small>선택 중</small>
          </h3>
          <div className="palette-tabs" role="tablist" aria-label="배정할 활동">
            {[
              ['task', '할 일'],
              ['study', '공부'],
              ['rest', '휴식'],
              ['other', '활동'],
            ].map(([id, name]) => (
              <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}>
                {name}
              </button>
            ))}
          </div>
          <div className="palette-items">
            {tab === 'task' && (
              <>
                {!tasks.length && <p>지금은 할 일이 없어요.</p>}
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    disabled={closed || night}
                    onClick={() => place('task', task.id)}
                  >
                    <span>{task.name}</span>
                    <small>
                      {taskEstimate(state, task)}칸 ·{' '}
                      {task.deadline === state.week
                        ? '이번 주 마감'
                        : `${task.deadline - state.week}주 남음`}
                    </small>
                  </button>
                ))}
              </>
            )}
            {tab === 'study' &&
              state.courses.map((id) => (
                <button key={id} disabled={closed} onClick={() => place('study', id)}>
                  <BookOpen size={18} />
                  {courses[id].name}
                </button>
              ))}
            {tab === 'rest' &&
              ['sleep', 'exercise', 'game']
                .filter((id) => !night || id === 'sleep')
                .map((id) => (
                  <button key={id} disabled={closed} onClick={() => place(id)}>
                    <ActivityIcon id={id} />
                    {activityName(id)}
                  </button>
                ))}
            {tab === 'other' && (
              <>
                {Object.entries(activities)
                  .filter(
                    ([id, a]) =>
                      ![
                        'study',
                        'task',
                        'sleep',
                        'exercise',
                        'game',
                        'skip',
                        'club',
                        'field_trip',
                        'teacher',
                      ].includes(id) &&
                      !activityLock(state, id) &&
                      a.category !== '고정',
                  )
                  .map(([id]) => (
                    <button key={id} disabled={closed || night} onClick={() => place(id)}>
                      <ActivityIcon id={id} />
                      {activityName(id)}
                    </button>
                  ))}
                {Object.entries(TEACHERS).map(([id, name]) => (
                  <button key={id} disabled={closed || night} onClick={() => place('teacher', id)}>
                    <ActivityIcon id="teacher" />
                    {name} 상담
                  </button>
                ))}
              </>
            )}
            {!night && selected % 3 === 0 && (
              <button disabled={closed} onClick={() => place('skip')}>
                <Moon size={18} />
                아침 불참
              </button>
            )}
          </div>
        </aside>
      </div>
      <footer className="schedule-footer">
        <details className="personal-presets">
          <summary>시간표 저장·불러오기</summary>
          <div>
            <input
              aria-label="시간표 이름"
              value={savedName}
              maxLength={16}
              onChange={(e) => setSavedName(e.target.value)}
            />
            <button
              disabled={closed || !savedName.trim()}
              onClick={() =>
                send({
                  type: 'save_preset',
                  slot: Math.min(2, Object.keys(state.campaign.presets).length),
                  name: savedName,
                })
              }
            >
              저장
            </button>
            {Object.entries(state.campaign.presets).map(([index, preset]) => (
              <button
                key={index}
                disabled={closed}
                onClick={() => send({ type: 'load_preset', slot: Number(index) })}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </details>
        <button onClick={onClose}>
          <Check size={18} />
          신청 완료
        </button>
        <button className="primary" disabled={closed} onClick={onStart}>
          <Play size={18} fill="currentColor" />한 주 시작
        </button>
      </footer>
    </section>
  );
}
