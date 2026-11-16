import OutcomesPanel from '../OutcomesPanel.jsx';
import { courses } from '../../../domain/catalog.js';
import YearReportPanel from '../YearReportPanel.jsx';
import TaskGamePanel from '../TaskGamePanel.jsx';
import TaskBoard from '../TaskBoard.jsx';
import {
  AdmissionsPanel,
  CalendarPanel,
  CoursesPanel,
  GroupPanel,
  StatsPanel,
} from '../AcademicPanels.jsx';
export default function SchoolPanels(context) {
  const { state, modal, game, tutorial, ui } = context;
  const { busy, send } = context.game;
  const { assign, close, advance, openEvent, setModal } = ui;
  return (
    <>
      {modal.type === 'tasks' && (
        <TaskBoard
          key={modal.taskId ?? 'all'}
          state={state}
          onAssign={assign}
          focusTask={modal.taskId}
          onPlay={(taskId) => setModal({ type: 'taskGame', taskId })}
        />
      )}
      {modal.type === 'taskGame' && state.tasks[modal.taskId] && (
        <TaskGamePanel
          task={state.tasks[modal.taskId]}
          state={state}
          draftKey={`sasa-input:${game.user ?? 'local'}:${state.flags.runRevision ?? 0}:${modal.taskId}:${state.tasks[modal.taskId].attempts?.total ?? 0}`}
          busy={busy}
          onAction={(action) => send({ type: 'task_game', task: modal.taskId, action })}
          onReload={game.reload}
          onStop={() => setModal({ type: 'running' })}
          onAssign={() => assign(modal.taskId)}
          onBack={() => setModal({ type: 'tasks', taskId: modal.taskId })}
          onContinue={() => advance()}
        />
      )}
      {modal.type === 'yearReport' && <YearReportPanel state={state} />}
      {modal.type === 'stats' && <StatsPanel state={state} />}
      {modal.type === 'courses' && <CoursesPanel state={state} />}
      {modal.type === 'calendar' && (
        <CalendarPanel state={state} onMonth={(month) => tutorial.observe(`calendar:${month}`)} />
      )}
      {modal.type === 'group' && (
        <GroupPanel state={state} onRecruit={() => openEvent('winter_study')} />
      )}
      {modal.type === 'admissions' && (
        <OutcomesPanel
          state={state}
          busy={busy}
          onDirection={(direction) => send({ type: 'admission_direction', direction })}
          onSchedule={() => ui.open('schedule')}
          onEnding={async (ending) => {
            if (await send({ type: 'ending', ending })) close();
          }}
        />
      )}
    </>
  );
}
