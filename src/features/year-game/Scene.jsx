import { useState } from 'react';
import { dialogueLines } from './dialogue.js';
import { ArrowUpRight, Check, ClipboardList, Heart } from 'lucide-react';
import { characterImage, dayRoom, nightRoom } from '../../assets.js';
import { activeTasks } from '../../domain/catalog.js';
import { Progress, StatList } from './ui.jsx';
import { STRAIN_STAGES } from '../../domain/senior-year.js';

export default function Scene({ state, night, onOpen, onTask }) {
  const [dialogue, setDialogue] = useState(0);
  const lines = dialogueLines(state.stats);
  const nextLine = () => setDialogue((value) => value + 1);
  const tasks = activeTasks(state).sort((a, b) => a.deadline - b.deadline);
  const completed = Object.values(state.tasks).filter((t) => t.status === 'completed');
  return (
    <section
      className={`scene ${night ? 'night' : ''}`}
      style={{ '--room-bg': `url("${night ? nightRoom : dayRoom}")` }}
      aria-label="나의 기숙사"
    >
      <div className="scene-left">
        <section className="task-paper">
          <span className="paper-tape" />
          <div className="paper-title">
            <h2>
              <ClipboardList size={17} /> 할 일
            </h2>
            <button
              data-tutorial="tasks"
              onClick={() => onOpen('tasks')}
              aria-label="할 일 전체 보기"
            >
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="paper-tasks">
            {tasks.slice(0, 3).map((task) => (
              <button className="paper-task" key={task.id} onClick={() => onTask(task.id)}>
                <span className="task-checkbox" />
                <span>
                  <b>{task.name}</b>
                  <small>
                    {task.deadline === state.week
                      ? '이번 주 마감'
                      : `${task.deadline - state.week}주 남음`}{' '}
                    <i>
                      {task.progress}/{task.target}
                    </i>
                  </small>
                  <Progress value={task.progress} max={task.target} label={task.name} />
                  <span className="assign-hint">과제 열기 →</span>
                </span>
              </button>
            ))}
            {!tasks.length && <p className="paper-empty">진행 중인 할 일 없음</p>}
            {completed.slice(-1).map((task) => (
              <div className="paper-task completed" key={task.id}>
                <span className="task-checkbox">
                  <Check size={12} />
                </span>
                <b>{task.name}</b>
              </div>
            ))}
          </div>
          <button className="paper-all" onClick={() => onOpen('tasks')}>
            {tasks.length
              ? `진행 중 ${tasks.length}개 · 완료 ${completed.length}개`
              : '나의 모든 할 일 보기'}{' '}
            <ArrowUpRight size={12} />
          </button>
        </section>
        <section className="condition-card">
          <div>
            <h2>
              <Heart size={14} /> 능력치{' '}
              {state.fatigue ? (
                <small className={`fatigue-tag stage-${state.fatigue}`}>
                  {STRAIN_STAGES[state.fatigue].name}
                </small>
              ) : null}
            </h2>
            <button
              data-tutorial="stats"
              onClick={() => onOpen('stats')}
              aria-label="능력치 자세히 보기"
            >
              <ArrowUpRight size={14} />
            </button>
          </div>
          <StatList
            stats={state.stats}
            keys={['hp', 'focus', 'reputation', 'stress', 'math', 'science']}
            compact
          />
        </section>
      </div>
      <div className="scene-character">
        <button className="lobby-speech" onClick={nextLine} aria-label="다른 혼잣말 듣기">
          <span aria-live="polite">{lines[dialogue % lines.length]}</span>
        </button>
        <button className="avatar" onClick={nextLine} aria-label={state.name + '의 혼잣말 듣기'}>
          <img
            src={characterImage(state.character)}
            alt={`${state.name} 캐릭터`}
            draggable={false}
          />
        </button>
      </div>
    </section>
  );
}
