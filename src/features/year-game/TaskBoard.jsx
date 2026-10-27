import { useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { effectText, period } from '../../domain/catalog.js';
import { Empty, Progress } from './ui.jsx';
import { taskAllocation } from '../../domain/planning.js';
import './planning.css';
export default function TaskBoard({ state, onAssign }) {
  const [filter, setFilter] = useState('active');
  const tasks = Object.values(state.tasks)
    .filter((t) => t.status === filter)
    .sort((a, b) => a.deadline - b.deadline);
  return (
    <>
      <p className="dialog-lead">
        클릭으로 완료 처리하지 않아요. 자습시간을 배정하고 한 주를 보내면 자동으로 체크돼요.
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
            <article className={`task-detail ${t.status}`} key={t.id}>
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
                <small>{period(t.deadline).label}</small>
              </div>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <Progress value={t.progress} max={t.target} label={t.name} />
              {t.status === 'active' && (
                <small className="task-allocation">
                  이번 주 배정 {taskAllocation(state, t).slots}칸
                </small>
              )}
              <footer>
                <span>
                  {t.progress} / {t.target}칸 · {Math.round((t.progress / t.target) * 100)}%
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
            </article>
          ))
        ) : (
          <Empty>이 목록에는 할 일이 없어요.</Empty>
        )}
      </div>
    </>
  );
}
