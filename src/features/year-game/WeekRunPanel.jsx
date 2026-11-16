import ActivityReplay from './ActivityReplay.jsx';
import { DAYS } from '../../domain/catalog.js';
import { SESSIONS } from './ui.jsx';
export default function WeekRunPanel({ state, busy, onContinue, onTask, onSkip, onEvent }) {
  const run = state.weekRun;
  if (!run) return null;
  const waiting = run.waiting;
  return (
    <section className="week-run-panel">
      <ActivityReplay
        key={run.cursor}
        character={state.character}
        actions={[...run.actions, ...(run.nightActions ?? [])]
          .sort((a, b) => a.index - b.index)
          .slice(-4)}
      />
      <span className="event-kicker">
        {DAYS[Math.min(6, Math.floor(run.cursor / 3))]}요일 ·{' '}
        {SESSIONS[run.cursor % 3] ?? '하루 마무리'}
      </span>
      <h3>
        {waiting?.kind === 'notice'
          ? waiting.title
          : waiting?.kind === 'task'
            ? state.tasks[waiting.task].name
            : '주간 일정 진행'}
      </h3>
      <p>
        {waiting?.kind === 'notice'
          ? waiting.text
          : waiting?.kind === 'task'
            ? '배정한 작업 시간입니다.'
            : run.cursor + ' / 21칸 진행'}
      </p>
      {waiting?.kind === 'notice' && waiting.task && (
        <button className="subtle full" onClick={onTask}>
          할 일 보기
        </button>
      )}
      {waiting?.kind === 'notice' && waiting.event && (
        <button className="subtle full" onClick={() => onEvent(waiting.event)}>
          알림 열기
        </button>
      )}
      {waiting?.kind === 'task' ? (
        <>
          <button className="primary full" disabled={busy} onClick={onTask}>
            작업 이어하기
          </button>
          <details>
            <summary>이번 작업 중단</summary>
            <p>이 시간의 준비 비용은 돌려받지 않습니다. 이번 작업의 진척은 반영되지 않습니다.</p>
            <button className="subtle full" disabled={busy} onClick={onSkip}>
              작업을 중단하고 계속
            </button>
          </details>
        </>
      ) : (
        <button className="primary full" disabled={busy} onClick={onContinue}>
          확인하고 계속
        </button>
      )}
    </section>
  );
}
