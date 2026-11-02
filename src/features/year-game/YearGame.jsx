import { useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
  Maximize2,
  MoreHorizontal,
  PencilLine,
  Settings,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { dayRoom, nightRoom } from '../../assets.js';
import { courses, DAYS, events, period } from '../../domain/catalog.js';
import { ENDINGS } from '../../domain/engine.js';
import { availableChapters, chapterProgress } from '../../domain/story.js';
import { weekDate } from '../../domain/calendar-date.js';
import useGame from './useGame.js';
import useAudio from './useAudio.js';
import useWorldClock from './useWorldClock.js';
import useTutorial from './useTutorial.js';
import { tutorialOpen } from './tutorial.js';
import TutorialGuide from './TutorialGuide.jsx';
import Setup from './Setup.jsx';
import Scene from './Scene.jsx';
import Planner from './Planner.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { GamePanel, panelDefinition, NAV } from './panels/index.jsx';
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
              {tutorialOpen(state, tutorial.count, tutorial.total) && (
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
                      notice.week === state.week &&
                      (notice.kind === 'rumor' ||
                        (notice.kind === 'task' && state.tasks[notice.task]?.status === 'active')),
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
            {state.ending.school && <b className="ending-school">{state.ending.school}</b>}
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
          title={panelDefinition(modal.type).title}
          onClose={close}
          wide={panelDefinition(modal.type).wide}
        >
          {state.week === 0 && tutorial.active && !['tutorial', 'help'].includes(modal.type) && (
            <button className="tutorial-return" onClick={() => open('tutorial')}>
              ← 튜토리얼 목록 {tutorial.count}/{tutorial.total}
            </button>
          )}
          <GamePanel
            context={{
              state,
              modal,
              game,
              audio,
              tutorial,
              ui: {
                copyDay,
                slot,
                assign,
                choose,
                close,
                advance,
                open,
                openEvent,
                continueWeek,
                lesson,
                setModal,
              },
            }}
          />
        </Modal>
      )}
    </div>
  );
}
