import { useState } from 'react';
import { CalendarDays, CheckCheck, HelpCircle, Moon, Save, Settings, Sun } from 'lucide-react';
import { dayRoom, nightRoom } from './assets.js';
import { dateLabel, nextEvent } from './game.js';
import { advanceWeek } from './systems/week.js';
import { usePlanEditor } from './hooks/usePlanEditor.js';
import { useSavedGame } from './hooks/useSavedGame.js';
import { useToast } from './hooks/useToast.js';
import Calendar from './components/Calendar.jsx';
import CharacterArea from './components/CharacterArea.jsx';
import GameBottom from './components/GameBottom.jsx';
import Modal from './components/Modal.jsx';
import Onboarding from './components/Onboarding.jsx';
import Planner from './components/Planner.jsx';
import StatsCard from './components/StatsCard.jsx';
import TaskPaper from './components/TaskPaper.jsx';
import BagModal from './components/modals/BagModal.jsx';
import HelpModal from './components/modals/HelpModal.jsx';
import NoticeModal from './components/modals/NoticeModal.jsx';
import RecordsModal from './components/modals/RecordsModal.jsx';
import SettingsModal from './components/modals/SettingsModal.jsx';
import ShopModal from './components/modals/ShopModal.jsx';
import StatsModal from './components/modals/StatsModal.jsx';
import { WeekPlanModal, WeekResultModal } from './components/modals/WeekModal.jsx';

const MODAL_TITLES = {
  settings: '설정',
  stats: '능력치',
  records: '기록',
  bag: '가방',
  shop: '매점',
  calendar: '달력',
  notice: '알림장',
  week: '이번 주 계획',
  help: '플레이 가이드',
};
const WIDE_MODALS = ['week', 'calendar'];

export default function App() {
  const { game, setGame, saveStatus, saveNow } = useSavedGame();
  const [toast, notify] = useToast();
  const [modal, setModal] = useState(null);
  const editor = usePlanEditor(game, setGame, notify);
  const event = nextEvent(game.week);
  const lastResult = game.history.at(-1);
  const close = () => setModal(null);

  if (!game.created) {
    return (
      <Onboarding
        onCreate={(name, character) => {
          setGame(old => ({ ...old, name, character, created: true }));
          notify('오른쪽 요일을 눌러 이번 주 일정을 짜세요.');
        }}
      />
    );
  }

  function save() {
    notify(saveNow() ? '지금까지의 설정과 일정을 저장했어요.' : '저장 공간을 사용할 수 없어요. 브라우저 설정을 확인해주세요.');
  }

  function startWeek() {
    if (editor.dirty) {
      notify('변경한 일정을 먼저 신청해주세요.');
      return;
    }
    setModal('week');
  }

  function confirmWeek() {
    setGame(advanceWeek);
    setModal('result');
  }

  const title = modal === 'result' ? `${dateLabel(lastResult.week)} 결과` : MODAL_TITLES[modal];

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./">SASA<span>Go3!</span><i>사사 고3 키우기</i></a>
        <div className="header-right">
          <span className="semester"><span /> 3학년 2학기</span>
          <button className="help-button" onClick={() => setModal('help')}><HelpCircle size={16} /> 플레이 가이드</button>
        </div>
      </header>
      <main>
        <section className="page-heading"><h1>{game.name}의 고3 2학기</h1></section>
        <section className={`game-frame ${game.night ? 'night' : ''}`} aria-label="나의 기숙사">
          <header className="game-toolbar">
            <div className="date-display">
              <CalendarDays size={18} />
              <strong>{dateLabel(game.week)}</strong>
              {event && (
                <>
                  <span className="date-divider" />
                  <span className="dday">{event.days === 0 ? 'D-DAY' : `D - ${event.days}`} <span>{event.label}</span></span>
                </>
              )}
            </div>
            <div className="toolbar-actions">
              <span className="save-state"><CheckCheck size={14} /> {saveStatus}</span>
              <button
                aria-label={game.night ? '낮 배경으로 변경' : '밤 배경으로 변경'}
                title="낮 / 밤 배경"
                onClick={() => setGame(old => ({ ...old, night: !old.night }))}
              >
                {game.night ? <Moon size={19} /> : <Sun size={19} />}
              </button>
              <button aria-label="설정" onClick={() => setModal('settings')}><Settings size={19} /></button>
              <button aria-label="저장" onClick={save}><Save size={19} /></button>
            </div>
          </header>
          <div className="room" style={{ '--room-image': `url("${game.night ? nightRoom : dayRoom}")` }}>
            <div className="room-shade" />
            <aside className="left-panels">
              <TaskPaper
                tasks={game.tasks}
                onToggle={index => setGame(old => ({ ...old, tasks: old.tasks.map((v, i) => (i === index ? !v : v)) }))}
              />
              <StatsCard stats={game.stats} onOpen={() => setModal('stats')} />
            </aside>
            <CharacterArea game={game} />
            <Planner game={game} editor={editor} onOpenCalendar={() => setModal('calendar')} onOpenNotice={() => setModal('notice')} />
            <div className="room-label"><span /> {game.night ? 'NIGHT' : 'AFTER SCHOOL'} <i /> 나의 기숙사</div>
          </div>
          <GameBottom money={game.money} onOpen={setModal} onStartWeek={startWeek} />
        </section>
        <footer className="page-footer"><span>SASAGo3!</span></footer>
      </main>
      {toast && <div role="status" className="toast">{toast}</div>}
      {modal && (
        <Modal title={title} onClose={close} wide={WIDE_MODALS.includes(modal)}>
          {modal === 'settings' && (
            <SettingsModal
              game={game}
              onSave={(name, character) => {
                setGame(old => ({ ...old, name, character }));
                close();
                notify('프로필을 변경했어요.');
              }}
            />
          )}
          {modal === 'stats' && <StatsModal game={game} />}
          {modal === 'records' && <RecordsModal history={game.history} />}
          {modal === 'bag' && <BagModal onOpenShop={() => setModal('shop')} />}
          {modal === 'shop' && <ShopModal money={game.money} />}
          {modal === 'calendar' && <Calendar game={game} />}
          {modal === 'notice' && <NoticeModal week={game.week} onClose={close} />}
          {modal === 'week' && <WeekPlanModal game={game} onStart={confirmWeek} />}
          {modal === 'result' && <WeekResultModal entry={lastResult} stats={game.stats} onClose={close} />}
          {modal === 'help' && <HelpModal />}
        </Modal>
      )}
    </div>
  );
}
