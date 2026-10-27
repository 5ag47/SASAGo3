import { useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  History,
  LockKeyhole,
  Maximize2,
  MoreHorizontal,
  PencilLine,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { dayRoom, nightRoom } from '../../assets.js';
import { activities, choiceDeadline, courses, DAYS, events, period } from '../../domain/catalog.js';
import { ENDINGS } from '../../domain/engine.js';
import { availableChapters, chapterProgress } from '../../domain/story.js';
import { effectivePlan, lockedSlots } from '../../domain/week.js';
import { weekDate } from '../../domain/calendar-date.js';
import useGame from './useGame.js';
import useAudio from './useAudio.js';
import useWorldClock from './useWorldClock.js';
import useTutorial from './useTutorial.js';
import TutorialPanel from './TutorialPanel.jsx';
import TutorialGuide from './TutorialGuide.jsx';
import WeekReviewPanel from './WeekReviewPanel.jsx';
import Setup from './Setup.jsx';
import Scene from './Scene.jsx';
import Planner from './Planner.jsx';
import DayCopy from './DayCopy.jsx';
import YearReportPanel from './YearReportPanel.jsx';
import TaskGamePanel from './TaskGamePanel.jsx';
import StoryPanel from './StoryPanel.jsx';
import WeekRunPanel from './WeekRunPanel.jsx';
import ActivityPicker from './ActivityPicker.jsx';
import TaskBoard from './TaskBoard.jsx';
import EventDialog from './EventDialog.jsx';
import {
  AdmissionsPanel,
  CalendarPanel,
  CoursesPanel,
  GroupPanel,
  StatsPanel,
} from './AcademicPanels.jsx';
import { NoticesPanel, RecordsPanel, WeekResult } from './RecordPanels.jsx';
import ShopPanel from './ShopPanel.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { ActivityIcon, activityName, ChoiceButton, SESSIONS } from './ui.jsx';

const TITLES = {
  slot: '자습 신청',
  schedule: '주간 일정',
  tasks: '할 일',
  events: '알림',
  stats: '능력치',
  courses: '수강 과목·성적',
  calendar: '학사 달력',
  group: '스터디',
  admissions: '진학실',
  records: '기록',
  yearReport: '한 해 결산',
  taskGame: '과제 미니게임',
  story: '학교 이야기',
  running: '주간 일정 진행',
  notices: '알림',
  shop: '매점',
  settings: '설정',
  help: '도움말',
  tutorial: '도움말',
  confirm: '한 주 진행',
  result: '주간 결과',
  leave: '휴학',
  menu: '메뉴',
};
const NAV = [
  ['courses', BookOpen, '수강 과목'],
  ['group', Users, '스터디'],
  ['shop', ShoppingBag, '매점'],
  ['records', History, '기록'],
  ['admissions', GraduationCap, '진학실'],
];
export default function YearGame() {
  const game = useGame();
  const { state, busy, send, notify } = game;
  const audio = useAudio();
  const { night } = useWorldClock();
  const tutorial = useTutorial(state, game.user);
  const [modal, setModal] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const open = (type) => {
    tutorial.observe(type);
    return type === 'planner' ? setPlanOpen((v) => !v) : setModal({ type });
  };
  const close = () => setModal(null);
  const openEvent = (id) => {
    if (id === 'winter_study') tutorial.observe('study-event');
    setModal({ type: 'events', eventId: id });
  };
  const p = period(state.week);
  const gameDay = Math.min(6, Math.floor((state.weekRun?.cursor ?? 0) / 3));
  const gameDate = weekDate(state.week, gameDay).slice(5).replace('-', '.');
  async function create(profile) {
    const next = await send({ type: 'create', profile });
    if (next) {
      tutorial.reset();
      setModal({ type: 'story', chapterId: availableChapters(next)[0].id });
    }
  }
  function lesson(lesson) {
    tutorial.visit(lesson.id);
    close();
  }
  function assign(task) {
    setAssignment(task);
    setPlanOpen(true);
    close();
    notify('배정할 시간을 선택하세요.');
  }
  async function slot(index) {
    if (assignment) {
      const tutorial = state.tasks[assignment]?.special === 'tutorial';
      const command = {
        type: 'plan',
        index,
        activity: tutorial ? 'study' : 'task',
        target: tutorial ? state.courses.find((id) => courses[id].ability === 'math') : assignment,
      };
      if (await send(command)) {
        setAssignment(null);
        notify('일정에 배정했습니다.');
      }
    } else setModal({ type: 'slot', index });
  }
  function showRun(next) {
    if (!next.weekRun) open('result');
    else if (['task', 'task_result'].includes(next.weekRun.waiting?.kind))
      setModal({ type: 'taskGame', taskId: next.weekRun.waiting.task });
    else setModal({ type: 'running' });
  }
  async function advance(skipTask = false) {
    const next = await send({ type: 'advance', ...(skipTask === true ? { skipTask: true } : {}) });
    if (next) {
      setAssignment(null);
      showRun(next);
    }
  }
  function continueWeek() {
    const chapter = availableChapters(state).find(
      (chapter) => chapter.week === state.week && !chapterProgress(state, chapter.id).read,
    );
    if (chapter) setModal({ type: 'story', chapterId: chapter.id });
    else close();
  }
  async function choose(command) {
    const next = await send({ type: 'choose', ...command });
    if (!next) return;
    if (
      (command.event === 'dorm_cards' && next.minigames.cards) ||
      (command.event === 'interview_day' && next.minigames.interview)
    )
      setModal({ type: 'events', eventId: command.event });
    else if (!next.pending.includes(command.event)) close();
  }
  async function copyDay(sourceDay, days) {
    if (!(await send({ type: 'copy_day', sourceDay, days }))) return false;
    notify('요일 일정을 복사했습니다.');
    return true;
  }
  async function fullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify('현재 브라우저에서는 전체 화면 전환이 지원되지 않습니다.');
    }
  }
  if (!state.created || (game.mode === 'server' && !game.user))
    return (
      <>
        <Setup
          onCreate={create}
          busy={busy}
          mode={game.mode}
          onLogin={game.login}
          loginRequired={game.mode === 'server' && !game.user}
        />
        {game.issue && (
          <div className="boot-issue" role="alert">
            {game.issue}
            <button onClick={game.updateRequired ? game.refreshClient : () => open('settings')}>
              {game.updateRequired ? '새 버전 불러오기' : '저장 설정'}
            </button>
          </div>
        )}
        {modal?.type === 'settings' && (
          <Modal title="저장 설정" onClose={close}>
            <SettingsPanel game={game} audio={audio} onClose={close} />
          </Modal>
        )}
        {game.message && (
          <div className="toast" role="status">
            {game.message}
          </div>
        )}
      </>
    );
  if (game.signedOut)
    return (
      <div className="pause-screen">
        <LockKeyhole size={38} />
        <h1>플레이 일시 중지</h1>
        <button className="primary" onClick={game.resume}>
          계속 <ChevronRight size={16} />
        </button>
      </div>
    );
  return (
    <div
      className={`year-app immersive game-hud ${night ? 'world-night' : ''} ${planOpen ? 'plan-open' : ''}`}
      style={{ '--world-bg': `url("${night ? nightRoom : dayRoom}")` }}
    >
      <main className="game-main">
        {(game.issue || game.conflict) && (
          <div role="alert" className="save-alert">
            <ShieldCheck size={17} />
            <span>{game.issue ?? '다른 창에서 기록이 바뀌었습니다.'}</span>
            <button onClick={game.updateRequired ? game.refreshClient : game.reload}>
              {game.updateRequired ? '새 버전 불러오기' : '최신 기록 불러오기'}
            </button>
            <button onClick={() => open('settings')}>백업·복원</button>
          </div>
        )}
        <section className="game-window">
          <div className="window-toolbar">
            <div>
              <b>{p.label}</b>
              <span className="world-time">
                {gameDate} {DAYS[gameDay]}요일
              </span>
              {state.week === 0 && (
                <button className="tutorial-badge" onClick={() => open('tutorial')}>
                  튜토리얼 {tutorial.count}/{tutorial.total}
                </button>
              )}
            </div>
            <div className="hud-tools">
              <span
                className="save-indicator"
                data-status={game.issue || game.conflict ? 'error' : busy ? 'busy' : 'saved'}
                aria-label={
                  busy ? '저장 중' : game.issue || game.conflict ? '저장 확인 필요' : '자동 저장됨'
                }
                title={
                  busy ? '저장 중' : game.issue || game.conflict ? '저장 확인 필요' : '자동 저장됨'
                }
              >
                <i />
              </span>
              <button
                className="notification-button"
                data-tutorial="notices"
                onClick={() => open('notices')}
                aria-label="알림"
              >
                <Bell size={19} />
                {(state.pending.length > 0 ||
                  state.notices.some(
                    (notice) =>
                      notice.kind === 'task' &&
                      notice.week === state.week &&
                      state.tasks[notice.task]?.status === 'active',
                  )) && <i className="notification-dot" />}
              </button>
              <button onClick={() => open('help')} aria-label="도움말">
                <CircleHelp size={18} />
              </button>
              <button onClick={fullScreen} aria-label="전체 화면 전환">
                <Maximize2 size={18} />
              </button>
              <button onClick={() => open('settings')} aria-label="설정">
                <Settings size={18} />
              </button>
            </div>
          </div>
          <div className="game-content">
            {state.weekRun && (
              <button className="run-resume" disabled={busy} onClick={() => showRun(state)}>
                {DAYS[Math.min(6, Math.floor(state.weekRun.cursor / 3))]}요일 · 일정 진행 중 ·
                이어하기
              </button>
            )}
            <Scene
              state={state}
              night={night}
              onOpen={open}
              onTask={(taskId) => setModal({ type: 'tasks', taskId })}
            />
            <Planner
              state={state}
              busy={busy}
              onSlot={slot}
              onPreset={async (preset) => {
                if (await send({ type: 'preset', preset })) notify('일정을 변경했습니다.');
              }}
              onCopy={copyDay}
              onStart={() =>
                state.weekRun ? showRun(state) : open(state.week > 40 ? 'admissions' : 'confirm')
              }
              onWeek={() => open('schedule')}
              assignment={assignment}
              cancelAssignment={() => setAssignment(null)}
              onClose={() => setPlanOpen(false)}
            />
          </div>
          <footer className="game-menu">
            <nav aria-label="게임 메뉴">
              <button data-tutorial="calendar" onClick={() => open('calendar')}>
                <CalendarDays size={21} />
                <span>달력</span>
              </button>
              <button
                data-tutorial="schedule"
                className="mobile-planner-button"
                onClick={() => open('planner')}
              >
                <PencilLine size={20} />
                <span>자습</span>
              </button>
              {NAV.map(([type, Icon, label]) => (
                <button
                  className={['courses', 'group', 'admissions'].includes(type) ? 'extra-nav' : ''}
                  key={type}
                  data-tutorial={type}
                  onClick={() => open(type)}
                >
                  <Icon size={20} strokeWidth={1.6} />
                  <span>{label}</span>
                </button>
              ))}
              <button
                data-tutorial="menu"
                className="mobile-more-button"
                onClick={() => open('menu')}
              >
                <MoreHorizontal size={20} />
                <span>더보기</span>
              </button>
            </nav>
            <div className="wallet">
              <Wallet size={19} />
              <b>
                {state.money.toLocaleString()}
                <small> 원</small>
              </b>
            </div>
          </footer>
        </section>
        {state.ending && (
          <section className="ending-card">
            <span className="eyebrow">ENDING</span>
            <h2>{ENDINGS[state.ending.id].title}</h2>
            <p>{ENDINGS[state.ending.id].description}</p>
            <div>
              <button className="primary" onClick={() => open('yearReport')}>
                한 해 결산
              </button>
              <button className="subtle" onClick={() => open('records')}>
                기록 보기
              </button>
              <button className="subtle" onClick={() => open('settings')}>
                새 게임
              </button>
            </div>
          </section>
        )}
      </main>
      {game.message && (
        <div role="status" className="toast">
          {game.message}
        </div>
      )}
      <TutorialGuide
        tutorial={tutorial}
        state={state}
        modal={modal?.type}
        onHelp={() => open('tutorial')}
        onDismiss={() => tutorial.visit(null)}
      />
      {modal && (
        <Modal
          title={TITLES[modal.type]}
          onClose={close}
          wide={[
            'schedule',
            'calendar',
            'courses',
            'tasks',
            'admissions',
            'result',
            'records',
            'help',
            'tutorial',
          ].includes(modal.type)}
        >
          {state.week === 0 && tutorial.active && !['tutorial', 'help'].includes(modal.type) && (
            <button className="tutorial-return" onClick={() => open('tutorial')}>
              ← 튜토리얼 목록 {tutorial.count}/{tutorial.total}
            </button>
          )}
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
                          {selected.activity === 'study' && (
                            <em>{courses[selected.target]?.short}</em>
                          )}
                          {selected.activity === 'task' && (
                            <em>{state.tasks[selected.target]?.name}</em>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
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
          {modal.type === 'yearReport' && <YearReportPanel state={state} />}
          {modal.type === 'events' && (
            <EventDialog
              key={modal.eventId ?? state.pending[0] ?? 'empty'}
              state={state}
              eventId={modal.eventId}
              busy={busy}
              onChoose={choose}
              onDone={close}
            />
          )}
          {modal.type === 'stats' && <StatsPanel state={state} />}
          {modal.type === 'courses' && (
            <CoursesPanel
              state={state}
              busy={busy}
              onElective={async (course, term, enabled) => {
                if (await send({ type: 'elective', course, term, enabled }))
                  notify('수강신청을 변경했습니다.');
              }}
            />
          )}
          {modal.type === 'calendar' && (
            <CalendarPanel
              state={state}
              onMonth={(month) => tutorial.observe(`calendar:${month}`)}
            />
          )}
          {modal.type === 'group' && (
            <GroupPanel state={state} onRecruit={() => openEvent('winter_study')} />
          )}
          {modal.type === 'admissions' && (
            <AdmissionsPanel
              state={state}
              busy={busy}
              onEnding={async (ending) => {
                if (await send({ type: 'ending', ending })) close();
              }}
            />
          )}
          {modal.type === 'records' && (
            <RecordsPanel
              state={state}
              onRead={tutorial.readResult}
              onStory={(chapterId) => setModal({ type: 'story', chapterId })}
            />
          )}
          {modal.type === 'story' &&
            availableChapters(state).some((chapter) => chapter.id === modal.chapterId) && (
              <StoryPanel
                key={modal.chapterId}
                state={state}
                chapter={availableChapters(state).find((chapter) => chapter.id === modal.chapterId)}
                busy={busy}
                onProgress={(action) => send({ type: 'story', chapter: modal.chapterId, action })}
                onNavigate={open}
                onClose={close}
              />
            )}
          {modal.type === 'notices' && (
            <>
              {state.pending.length > 0 && (
                <div className="pending-notices">
                  {state.pending.map((id) => (
                    <button key={id} onClick={() => openEvent(id)}>
                      <span>
                        <b>{events[id].name}</b>
                        <small>
                          {choiceDeadline(id) === state.week
                            ? '이번 주 마감'
                            : `${choiceDeadline(id) - state.week}주 남음`}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              )}
              <NoticesPanel
                state={state}
                onStory={(chapterId) => setModal({ type: 'story', chapterId })}
                onReview={openEvent}
                onTask={(taskId) => setModal({ type: 'tasks', taskId })}
              />
            </>
          )}
          {modal.type === 'shop' && (
            <ShopPanel
              state={state}
              busy={busy}
              onBuy={async (item) => {
                if (await send({ type: 'buy', item })) notify('사용했습니다.');
              }}
            />
          )}
          {modal.type === 'settings' && (
            <SettingsPanel
              game={game}
              audio={audio}
              onClose={close}
              onLeave={() => open('leave')}
            />
          )}
          {['help', 'tutorial'].includes(modal.type) && (
            <TutorialPanel tutorial={tutorial} state={state} onLesson={lesson} />
          )}
          {modal.type === 'menu' &&
            NAV.map(([id, Icon, label]) => (
              <ChoiceButton
                key={id}
                anchor={id}
                title={label}
                icon={<Icon size={17} />}
                onClick={() => open(id)}
              />
            ))}
          {modal.type === 'confirm' && (
            <WeekReviewPanel
              state={state}
              busy={busy}
              onStart={() => advance()}
              onTaskGame={(taskId) => setModal({ type: 'taskGame', taskId })}
              onSchedule={() => open('schedule')}
              onTask={assign}
              onNotices={() => open('notices')}
            />
          )}
          {modal.type === 'result' && state.history.at(-1) && (
            <WeekResult
              entry={state.history.at(-1)}
              onContinue={continueWeek}
              onRead={tutorial.readResult}
            >
              {state.history.at(-1).week === 0 && (
                <div className="tutorial-recap">
                  <b>
                    겨울방학 실습 {tutorial.count}/{tutorial.total}
                  </b>
                  <button className="subtle" onClick={() => open('tutorial')}>
                    연습 내용 다시 보기
                  </button>
                </div>
              )}
            </WeekResult>
          )}
          {modal.type === 'leave' && (
            <>
              <p className="dialog-lead">
                휴학을 선택하면 이번 게임의 진행을 마칩니다. 기록은 보존됩니다.
              </p>
              <ChoiceButton
                title="휴학하기"
                onClick={async () => {
                  if (await send({ type: 'ending', ending: 'leave' })) close();
                }}
              />
              <button className="subtle full" onClick={close}>
                취소
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
