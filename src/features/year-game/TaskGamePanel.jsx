import { taskModule, taskGameStatus } from '../../domain/task-modules/registry.js';
import { attemptCost, attemptLimitReached } from '../../domain/task-attempts.js';
import { effectText } from '../../domain/catalog.js';
import { TASK_GAME_VIEWS } from './task-games/registry.jsx';
import useTaskInput from './task-games/useTaskInput.js';
import './task-games.css';
function Playable({ task, busy, onAction, onReload, draftKey, View }) {
  const input = useTaskInput(task, busy, onAction, draftKey);
  return (
    <>
      <View data={input.data} busy={input.blocked} onAction={input.input} />
      <small role="status">
        {input.error || (input.blocked ? '결과 확인 중' : input.saving ? '저장 중' : '')}
      </small>
      {input.error && (
        <>
          <button className="subtle full" disabled={busy} onClick={input.retry}>
            저장 다시 확인
          </button>
          {onReload && (
            <button
              className="subtle full"
              disabled={busy}
              onClick={async () => {
                const next = await onReload();
                if (next?.tasks?.[task.id]) input.acceptServer(next.tasks[task.id]);
              }}
            >
              임시 입력을 버리고 서버 기록으로 이어가기
            </button>
          )}
        </>
      )}
    </>
  );
}
export default function TaskGamePanel({
  task,
  state,
  busy,
  onAction,
  onAssign,
  onBack,
  onContinue,
  onReload,
  onStop,
  draftKey,
}) {
  const module = taskModule(task),
    View = TASK_GAME_VIEWS[module.game?.view];
  const outcome =
    state?.weekRun?.waiting?.kind === 'task_result' && state.weekRun.waiting.task === task.id
      ? state.weekRun.waiting
      : null;
  const canPlay = state
    ? state.weekRun?.waiting?.kind === 'task' && state.weekRun.waiting.task === task.id
    : Boolean(task.moduleData);
  const costs = state && module.game ? attemptCost(state, task) : {};
  return (
    <section className="task-game-panel">
      <small>{module.name}</small>
      <h3>{task.name}</h3>
      {outcome || task.status === 'completed' ? (
        <div className="task-game-passed" role="status">
          <b>{task.status === 'completed' ? '과제 완료' : '이번 작업 완료'}</b>
          <span>
            {task.progress} / {task.target}
            {module.unit}
            {outcome ? ' · 품질 ' + outcome.quality + '점' : ''}
          </span>
          <button className="primary full" disabled={busy} onClick={outcome ? onContinue : onBack}>
            {outcome ? '계속 진행' : '완료 기록 보기'}
          </button>
        </div>
      ) : !View ? (
        <p>일정에 배정한 시간에 작업합니다.</p>
      ) : !canPlay ? (
        <>
          <p>자습시간에 배정한 뒤 한 주를 진행하면 해당 시간에 작업을 시작합니다.</p>
          <button className="primary full" disabled={busy} onClick={onAssign}>
            일정에 넣기
          </button>
        </>
      ) : task.moduleData && taskGameStatus(task) === 'failure' ? (
        <>
          <p>이번 도전은 마치지 못했습니다. 진척은 오르지 않았습니다.</p>
          <p>다시 도전 · {effectText(costs)}</p>
          <button
            className="primary full"
            disabled={busy || (state && attemptLimitReached(state, task))}
            onClick={() => onAction({ type: 'restart' })}
          >
            다시 도전
          </button>
        </>
      ) : task.moduleData ? (
        <Playable
          key={task.id + '-' + (task.attempts?.total ?? 0)}
          task={task}
          busy={busy}
          onAction={onAction}
          onReload={onReload}
          draftKey={draftKey}
          View={View}
        />
      ) : (
        <>
          <p>{module.game.instructions}</p>
          <p>
            작업 {task.progress} / {task.target}
            {module.unit}
          </p>
          {Object.keys(costs).length > 0 && (
            <p className="task-attempt-cost">도전 비용 · {effectText(costs)}</p>
          )}
          {task.module.params.weeklyLimit && (
            <small>
              이번 주 {task.attempts?.week === state.week ? task.attempts.weekCount : 0} /{' '}
              {task.module.params.weeklyLimit}회
            </small>
          )}
          <button
            className="primary full"
            disabled={busy || (state && attemptLimitReached(state, task))}
            onClick={() => onAction({ type: 'start' })}
          >
            작업 시작
          </button>
        </>
      )}
      <button className="subtle full" onClick={onBack}>
        할 일로 돌아가기
      </button>
      {canPlay && !outcome && onStop && (
        <button className="subtle full" disabled={busy} onClick={onStop}>
          이번 작업 중단
        </button>
      )}
    </section>
  );
}
