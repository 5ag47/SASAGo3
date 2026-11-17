import './hannah.css';
import { useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Code2,
  Maximize2,
  PencilLine,
  Play,
  Settings,
  Wallet,
} from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { dayRoom, nightRoom } from '../../assets.js';
import { DAYS, period } from '../../domain/catalog.js';
import { ENDINGS } from '../../domain/engine.js';
import { availableChapters, chapterProgress } from '../../domain/story.js';
import { weekDate } from '../../domain/calendar-date.js';
import { developerTime } from '../../domain/game-time.js';
import useGame from './useGame.js';
import useAudio from './useAudio.js';
import useWorldClock from './useWorldClock.js';
import useTutorial from './useTutorial.js';
import Setup from './Setup.jsx';
import Scene from './Scene.jsx';
import Planner from './Planner.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import EventScene from './EventScene.jsx';
import { GamePanel, panelDefinition, NAV } from './panels/index.jsx';

export default function YearGame() {
  const game = useGame();
  const { state, busy, send, notify } = game;
  const audio = useAudio();
  const clock = useWorldClock();
  const testHour = Number(developerTime(state).slice(11, 13));
  const night = game.developer ? testHour < 7 || testHour >= 19 : clock.night;
  const tutorial = useTutorial(state, game.user);
  const [modal, setModal] = useState(null);
  const [guide, setGuide] = useState(0);
  const [guideHidden, setGuideHidden] = useState(false);
  const [guideRequested, setGuideRequested] = useState(false);
  const close = () => setModal(null);
  function open(type) {
    if (['schedule', 'slot', 'planner'].includes(type)) type = 'planner';
    if (type === 'tutorial') {
      setGuide(0);
      setGuideHidden(false);
      setGuideRequested(true);
      return close();
    }
    tutorial.observe(type);
    setModal({ type });
  }
  const p = period(state.week);
  const gameDay = Math.min(6, Math.floor((state.weekRun?.cursor ?? 0) / 3));
  const gameDate = weekDate(state.week, gameDay).slice(5).replace('-', '.');
  function showRun(next) {
    if (!next.weekRun) open('result');
    else if (['task', 'task_result'].includes(next.weekRun.waiting?.kind))
      setModal({ type: 'taskGame', taskId: next.weekRun.waiting.task });
    else open('running');
  }
  async function advance(skipTask = false) {
    const next = await send({ type: 'advance', ...(skipTask === true ? { skipTask: true } : {}) });
    if (next) {
      audio.cue();
      showRun(next);
    }
  }
  async function create(profile) {
    const next = await send({ type: 'create', profile });
    if (next) {
      tutorial.reset();
      setGuide(0);
      setGuideHidden(false);
      setModal({ type: 'story', chapterId: availableChapters(next)[0].id });
    }
  }
  function continueWeek() {
    const chapter = availableChapters(state).find(
      (c) => c.week === state.week && !chapterProgress(state, c.id).read,
    );
    if (chapter) setModal({ type: 'story', chapterId: chapter.id });
    else close();
  }
  async function choose(command) {
    const next = await send({ type: 'choose', ...command });
    if (!next) return;
    audio.cue();
    if (
      (command.event === 'dorm_cards' && next.minigames.cards) ||
      (command.event === 'interview_day' && next.minigames.interview)
    )
      setModal({ type: 'events', eventId: command.event });
    else if (!next.pending.includes(command.event)) next.weekRun ? open('running') : close();
  }
  const openEvent = (eventId) => setModal({ type: 'events', eventId });
  const assign = () => open('planner');
  const slot = () => open('planner');
  async function copyDay(sourceDay, days) {
    return Boolean(await send({ type: 'copy_day', sourceDay, days }));
  }
  function finishDeveloperAdvance(next) {
    next.ending || next.week > 40 ? open('admissions') : open('developer');
  }
  async function fullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify('이 브라우저에서는 전체 화면을 사용할 수 없어요.');
    }
  }
  const start = () =>
    state.ending || state.week > 40
      ? open('admissions')
      : state.weekRun
        ? showRun(state)
        : advance();
  const reviewingGame =
    modal?.type === 'events' &&
    ((modal.eventId === 'dorm_cards' && state.minigames.cards) ||
      (modal.eventId === 'interview_day' && state.minigames.interview));
  const newEvent =
    !game.developer &&
    state.pending.length &&
    (!modal || ['running', 'events'].includes(modal.type)) &&
    !reviewingGame
      ? state.pending[0]
      : null;
  const hints = [
    ['자습 신청에서 이번 주를 준비해요.', 'planner'],
    ['오른쪽 할 일·과목 버튼을 누르면 선택한 칸에 들어가요.', 'planner'],
    ['한 주 시작을 누르면 일정에 따라 하루씩 진행돼요.', null],
    ['활동 뒤 +, − 숫자로 능력치 변화를 확인하세요.', 'stats'],
    ['건강과 스트레스를 살피며 입시까지 한 해를 보내세요.', null],
  ];
  if (!state.created || (game.mode === 'server' && !game.user))
    return (
      <>
        <Setup
          onCreate={create}
          seed={state.seed}
          busy={busy}
          mode={game.mode}
          onLogin={game.login}
          loginRequired={game.mode === 'server' && !game.user}
          developer={game.developer}
          developerAvailable={game.developerAvailable}
        />
        {game.issue && (
          <div className="boot-issue" role="alert">
            {game.issue}
            <button onClick={() => open('settings')}>저장 설정</button>
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
  return (
    <div
      className={`year-app immersive game-hud v2-game ${night ? 'world-night' : ''}`}
      style={{ '--world-bg': `url("${night ? nightRoom : dayRoom}")` }}
    >
      <main className="game-main">
        <section className={`game-window ${state.week >= 37 ? 'christmas' : ''}`}>
          <header className="window-toolbar">
            <div className="player-heading">
              <strong>{state.name}</strong>
              <span>{p.label}</span>
              <b>
                {gameDate} {DAYS[gameDay]}
              </b>
              {game.developer && <em>TEST · {developerTime(state).slice(11)}</em>}
            </div>
            <div className="hud-tools">
              <span className="wallet">
                <Wallet size={19} />
                <b>{state.money.toLocaleString()}원</b>
              </span>
              <button onClick={() => open('notices')} aria-label="알림">
                <Bell size={22} />
                {state.pending.length > 0 && <i>!</i>}
              </button>
              {game.developer && (
                <button onClick={() => open('developer')} aria-label="개발자 모드">
                  <Code2 size={22} />
                </button>
              )}
              <button onClick={fullScreen} aria-label="전체 화면 전환">
                <Maximize2 size={21} />
              </button>
              <button onClick={() => open('settings')} aria-label="설정">
                <Settings size={22} />
              </button>
            </div>
          </header>
          {(game.issue || game.conflict) && (
            <div role="alert" className="save-alert">
              {game.issue ?? '다른 창에서 기록이 바뀌었습니다.'}
              <button onClick={game.updateRequired ? game.refreshClient : game.reload}>
                최신 기록 불러오기
              </button>
              <button onClick={() => open('settings')}>저장 설정</button>
            </div>
          )}
          <div className="game-content">
            <Scene
              state={state}
              night={night}
              onOpen={open}
              onTask={(taskId) => setModal({ type: 'tasks', taskId })}
            />
            <aside className="lobby-actions">
              <button
                className="lobby-schedule"
                data-tutorial="schedule"
                onClick={() => open('planner')}
              >
                <PencilLine size={27} />
                <span>
                  자습 신청<small>이번 주 시간표</small>
                </span>
                <ChevronRight size={21} />
              </button>
              <button onClick={() => open('calendar')}>
                <CalendarDays size={24} />
                <span>학사 달력</span>
              </button>
              <div className="lobby-space" />
              <button className="week-start" disabled={busy} onClick={start}>
                <Play size={26} fill="currentColor" />
                <span>
                  {state.ending || state.week > 40
                    ? '한 해 결산'
                    : state.weekRun
                      ? '이어서 진행'
                      : '한 주 시작'}
                </span>
              </button>
            </aside>
            {(state.week <= 2 || guideRequested) && !guideHidden && !modal && !newEvent && (
              <div className="lobby-guide" role="status">
                <b>첫 주 연습 {guide + 1}/5</b>
                <span>{hints[guide][0]}</span>
                <button
                  onClick={() => {
                    if (hints[guide][1]) open(hints[guide][1]);
                    if (guide < 4) setGuide(guide + 1);
                    else setGuideHidden(true);
                  }}
                >
                  {guide === 4 ? '완료' : '다음'}
                </button>
                <button aria-label="안내 닫기" onClick={() => setGuideHidden(true)}>
                  ×
                </button>
              </div>
            )}
          </div>
          <footer className="game-menu">
            <nav aria-label="게임 메뉴">
              {NAV.map(([type, Icon, label]) => (
                <button key={type} onClick={() => open(type)}>
                  <Icon size={23} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            <button className="guide-reopen" onClick={() => open('tutorial')}>
              조작 안내
            </button>
          </footer>
        </section>
      </main>
      {game.message && (
        <div role="status" className="toast">
          {game.message}
        </div>
      )}
      {state.ending && !modal && (
        <section className="ending-ribbon">
          <strong>{ENDINGS[state.ending.id].title}</strong>
          <span>{state.ending.school}</span>
          <button onClick={() => open('yearReport')}>결산 보기</button>
        </section>
      )}
      {newEvent && (
        <EventScene
          state={state}
          busy={busy}
          night={night}
          eventId={newEvent}
          onChoose={choose}
          onDone={close}
        />
      )}
      {modal && !newEvent && (
        <div className={['story', 'events'].includes(modal.type) ? 'narrative-overlay' : ''}>
          <Modal
            title={modal.type === 'planner' ? '자습 신청' : panelDefinition(modal.type).title}
            onClose={close}
            wide={modal.type === 'planner' || panelDefinition(modal.type).wide}
          >
            {modal.type === 'planner' ? (
              <>
                {!guideHidden && guide === 1 && (
                  <div className="inline-guide" role="status">
                    {hints[1][0]}
                    <button
                      onClick={() => {
                        setGuide(2);
                        close();
                      }}
                    >
                      다음
                    </button>
                  </div>
                )}
                <Planner state={state} busy={busy} send={send} onStart={start} onClose={close} />
              </>
            ) : (
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
                    lesson: (lesson) => {
                      tutorial.visit(lesson.id);
                      close();
                    },
                    setModal,
                    finishDeveloperAdvance,
                  },
                }}
              />
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
