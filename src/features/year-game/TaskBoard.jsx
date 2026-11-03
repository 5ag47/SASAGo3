import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { effectText } from '../../domain/catalog.js';
import { weekDate } from '../../domain/calendar-date.js';
import { Empty, Progress } from './ui.jsx';
import { taskAllocation } from '../../domain/planning.js';
import './planning.css';
import { taskStages, TASK_FORMATS } from '../../domain/assignments.js';
import './task-stages.css';
import { taskModule, taskGameReady } from '../../domain/task-modules/registry.js';
export default function TaskBoard({ state, onAssign, onPlay, focusTask }) {
  const [filter, setFilter] = useState(state.tasks[focusTask]?.status ?? 'active');
  useEffect(() => {
    if (focusTask)
      document.getElementById(`task-${focusTask}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [focusTask]);
  const tasks = Object.values(state.tasks)
    .filter((t) => t.status === filter)
    .sort((a, b) => a.deadline - b.deadline);
  return (
    <>
      <p className="dialog-lead">
        자습시간에 할 일을 배정하세요. 한 주를 진행하면 배정한 시간에 직접 작업합니다.
      </p>
      <div className="filter-tabs">
        {[
          ['active', '진행 중'],
          ['completed', '완료'],
          ['expired', '마감 지남'],
        ].map(([id, label]) => (
          <button
            className={filter === id ? 'selected' : ''}
            key={id}
            onClick={() => setFilter(id)}
          >
            {label}
            <span>{Object.values(state.tasks).filter((t) => t.status === id).length}</span>
          </button>
        ))}
      </div>
      <div className="task-board">
        {tasks.length ? (
          tasks.map((t) => (
            <article
              id={`task-${t.id}`}
              data-focused={t.id === focusTask}
              className={`task-detail ${t.status}`}
              key={t.id}
            >
              <div>
                <span className={`task-deadline ${t.deadline === state.week ? 'urgent' : ''}`}>
                  {t.status === 'completed' ? <Check size={12} /> : <Clock size={12} />}
                  {t.status === 'completed'
                    ? '완료'
                    : t.status === 'expired'
                      ? '마감 지남'
                      : t.deadline === state.week
                        ? '이번 주 마감'
                        : `${t.deadline - state.week}주 남음`}
                </span>
                <small>
                  {weekDate(t.deadline, t.deadlineDay ?? 6)
                    .slice(5)
                    .replace('-', '.')}{' '}
                  마감
                </small>
              </div>
              <h3>{t.name}</h3>
              {t.format && <small>{TASK_FORMATS[t.format]}</small>}
              <p>{t.description}</p>
              <Progress value={t.progress} max={t.target} label={t.name} />
              {t.status === 'active' && taskModule(t).game && (
                <button
                  className={`${taskGameReady(t) ? 'subtle' : 'primary'} full task-game-action`}
                  onClick={() => onPlay(t.id)}
                >
                  {state.weekRun?.waiting?.task === t.id ? '작업 이어하기' : '작업 내용 보기'}
                </button>
              )}
              {t.stages && (
                <ol className="task-stages">
                  {taskStages(t).map((stage) => (
                    <li key={stage.id} className={stage.status}>
                      <span>
                        {stage.status === 'completed' ? '✓' : '·'} {stage.name}
                      </span>
                      <b>
                        {stage.progress} / {stage.target}
                      </b>
                    </li>
                  ))}
                </ol>
              )}
              {t.status === 'active' && (
                <small className="task-allocation">
                  이번 주 배정 {taskAllocation(state, t).slots}칸
                </small>
              )}
              <footer>
                <span>
                  {Math.round(t.progress * 100) / 100} / {t.target}
                  {taskModule(t).unit} · {Math.round((t.progress / t.target) * 100)}%
                </span>
                {t.status === 'active' && (
                  <button onClick={() => onAssign(t.id)}>
                    일정에 넣기 <ArrowRight size={13} />
                  </button>
                )}
              </footer>
              <small className="task-reward">
                완료: {effectText(t.reward) || '활동 기록'}
                <br />
                미완료: {effectText(t.penalty) || '추가 불이익 없음'}
              </small>
              {t.result?.note && <p>{t.result.note}</p>}
            </article>
          ))
        ) : (
          <Empty>이 목록에는 할 일이 없어요.</Empty>
        )}
      </div>
    </>
  );
}
