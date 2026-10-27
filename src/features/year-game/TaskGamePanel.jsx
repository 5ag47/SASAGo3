import { taskModule } from '../../domain/task-modules/registry.js';
import { TASK_GAME_VIEWS } from './task-games/registry.jsx';
import './task-games.css';
export default function TaskGamePanel({ task, busy, onAction, onAssign, onBack }) {
  const module = taskModule(task);
  const View = TASK_GAME_VIEWS[module.game?.view];
  const data = task.moduleData;
  return (
    <section className="task-game-panel">
      <small>{module.name}</small>
      <h3>{task.name}</h3>
      {!View ? (
        <p>이 처리 방식에는 별도 미니게임 화면이 없습니다.</p>
      ) : data?.passed ? (
        <div className="task-game-passed" role="status">
          <b>미니게임 완료</b>
          <span>{data.quality}점</span>
          <p>
            {task.status === 'completed'
              ? '과제가 완료되었습니다.'
              : '자습시간을 배정하고 한 주를 보내면 과제가 진행됩니다.'}
          </p>
          <button
            className="primary full"
            disabled={busy}
            onClick={task.status === 'completed' ? onBack : onAssign}
          >
            {task.status === 'completed' ? '완료 기록 보기' : '시간 배정'}
          </button>
        </div>
      ) : data ? (
        <View data={data} busy={busy} onAction={onAction} />
      ) : (
        <>
          <p>{module.game.instructions}</p>
          <button
            className="primary full"
            disabled={busy}
            onClick={() => onAction({ type: 'start' })}
          >
            시작
          </button>
        </>
      )}
      <button className="subtle full" onClick={onBack}>
        할 일로 돌아가기
      </button>
    </section>
  );
}
