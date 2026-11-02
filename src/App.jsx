import { useRef, useState } from 'react';
import { CheckCheck, HelpCircle, Settings, BookOpen } from 'lucide-react';
import { dayRoom, nightRoom } from './assets.js';
import { dateLabel } from './game.js';
import { enrollCourse } from './systems/enrollment.js';
import { advanceWeek } from './systems/week.js';
import { buyItem, useItem } from './systems/inventory.js';
import { restoreSession, SESSION_KEY } from './systems/accounts.js';
import { usePlanEditor } from './hooks/usePlanEditor.js';
import { useSavedGame } from './hooks/useSavedGame.js';
import { useToast } from './hooks/useToast.js';
import Auth from './components/Auth.jsx';
import { useDaylight } from './hooks/useDaylight.js';
import SaveTools from './components/SaveTools.jsx';
import Calendar from './components/Calendar.jsx';
import CharacterArea from './components/CharacterArea.jsx';
import GameBottom from './components/GameBottom.jsx';
import Modal from './components/Modal.jsx';
import Onboarding from './components/Onboarding.jsx';
import Planner from './components/Planner.jsx';
import StatsCard from './components/StatsCard.jsx';
import TaskPaper from './components/TaskPaper.jsx';
import BagModal from './components/modals/BagModal.jsx';
import CourseModal from './components/modals/CourseModal.jsx';
import HelpModal from './components/modals/HelpModal.jsx';
import NoticeModal from './components/modals/NoticeModal.jsx';
import RecordsModal from './components/modals/RecordsModal.jsx';
import SettingsModal from './components/modals/SettingsModal.jsx';
import ShopModal from './components/modals/ShopModal.jsx';
import StatsModal from './components/modals/StatsModal.jsx';
import { StoryModal, WeekPlanModal, WeekResultModal } from './components/modals/WeekModal.jsx';
const TITLES = {
  settings: '설정',
  stats: '나의 스탯',
  records: '나의 학기 기록',
  bag: '가방',
  shop: '방과 후 매점',
  calendar: '주간 달력',
  notice: '알림',
  week: '이번 주 계획',
  help: '플레이 가이드',
  courses: '수강신청',
  story: '이번 주 선택'
};
export default function App() {
  const [account, setAccount] = useState(() => restoreSession());
  function login(value) {
    sessionStorage.setItem(SESSION_KEY, value.id);
    setAccount(value);
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAccount(null);
  }
  return account ? <GameApp key={account.id} account={account} onLogout={logout} /> : <Auth onLogin={login} />;
}
function GameApp({
  account,
  onLogout
}) {
  const {
    game,
    setGame,
    saveStatus,
    saveNow,
    loadError,
    restore
  } = useSavedGame(account.id);
  const [toast, notify] = useToast();
  const [modal, setModal] = useState(null);
  const resolving = useRef(false);
  const editor = usePlanEditor(game, setGame, notify);
  const night = useDaylight();
  const last = game.history.at(-1);
  const close = () => setModal(null);
  function open(value) {
    if (value === 'courses' && game.enrolled) return;
    if (value === 'notice') setGame(old => ({
      ...old,
      noticeReadWeek: old.week
    }));
    setModal(value);
  }
  function logout() {
    if (!loadError && game.created && !saveNow()) {
      notify('저장에 실패했어요. 설정에서 백업을 다운로드해주세요.');
      return;
    }
    onLogout();
  }
  if (loadError) return <main className="recovery-card"><h1>저장 확인이 필요해요</h1><p>{loadError}</p><SaveTools onRestore={restore} /><button className="secondary" onClick={onLogout}>로그아웃</button></main>;
  if (!game.created) return <><Onboarding onCreate={(name, character) => {
      setGame(old => ({
        ...old,
        name,
        character,
        created: true
      }));
    }} /><button className="onboarding-logout secondary" onClick={logout}>계정 변경</button></>;
  function startWeek() {
    if (game.ended) {
      open('records');
      return;
    }
    if (!game.enrolled) {
      open('courses');
      notify('주요선택 과목을 먼저 신청해주세요.');
      return;
    }
    if (editor.dirty) {
      notify('변경한 일정을 먼저 신청하거나 취소해주세요.');
      return;
    }
    resolving.current = false;
    open('week');
  }
  function choose(index) {
    if (resolving.current) return;
    resolving.current = true;
    setGame(old => advanceWeek(old, index));
    open('result');
  }
  return <main className="app-shell fullscreen-game">
    <section className={`game-frame ${night ? 'night' : ''}`} aria-label="나의 기숙사">
      <header className="game-toolbar">
        <div className="date-display"><strong>{game.ended ? '학기 종료' : dateLabel(game.week)}</strong></div>
        <div className="toolbar-actions">
          <span className={`save-state ${saveStatus === '저장 실패' ? 'save-failed' : ''}`} role="status"><CheckCheck size={15} />{saveStatus === '저장됨' ? '자동 저장됨' : saveStatus}</span>
          {!game.enrolled && <button aria-label="수강신청" onClick={() => open('courses')}><BookOpen size={20} /></button>}
          <button aria-label="도움말" onClick={() => open('help')}><HelpCircle size={20} /></button>
          <button aria-label="설정" onClick={() => open('settings')}><Settings size={20} /></button>
        </div>
      </header>
      <div className="room" style={{
        '--room-image': `url("${night ? nightRoom : dayRoom}")`
      }}>
        <aside className="left-panels"><TaskPaper plan={game.plan} /><StatsCard stats={game.stats} major={game.major} onOpen={() => open('stats')} /></aside>
        <CharacterArea game={game} /><Planner game={game} editor={editor} />
      </div>
      <GameBottom money={game.money} ended={game.ended} unread={game.noticeReadWeek < game.week} onOpen={open} onStartWeek={startWeek} />
    </section>
    {toast && <div role="status" className="toast">{toast}</div>}
    {modal && <Modal title={modal === 'result' && last ? `${dateLabel(last.week)} 결과` : TITLES[modal]} onClose={close} wide={['week', 'calendar', 'result', 'records'].includes(modal)}>
      {modal === 'settings' && <SettingsModal game={game} onSave={(name, character) => {
        setGame(old => ({
          ...old,
          name,
          character
        }));
        close();
        notify('프로필을 저장했어요.');
      }} onRestore={data => {
        restore(data);
        close();
        notify('저장을 불러왔어요.');
      }} onLogout={logout} />}
      {modal === 'courses' && !game.enrolled && <CourseModal game={game} onEnroll={major => {
        setGame(old => enrollCourse(old, major));
        close();
        notify('수강신청을 확인했어요.');
      }} />}
      {modal === 'stats' && <StatsModal game={game} />}
      {modal === 'records' && <RecordsModal history={game.history} ended={game.ended} stats={game.stats} />}
      {modal === 'bag' && <BagModal game={game} onUse={id => setGame(old => useItem(old, id))} onOpenShop={() => open('shop')} />}
      {modal === 'shop' && <ShopModal game={game} onBuy={id => setGame(old => buyItem(old, id))} onOpenBag={() => open('bag')} />}
      {modal === 'calendar' && <Calendar game={game} />}
      {modal === 'notice' && <NoticeModal game={game} onClose={close} />}
      {modal === 'week' && <WeekPlanModal game={game} onStart={() => open('story')} />}
      {modal === 'story' && <StoryModal game={game} onChoose={choose} />}
      {modal === 'result' && last && <WeekResultModal entry={last} stats={game.stats} ended={game.ended} onClose={close} />}
      {modal === 'help' && <HelpModal />}
    </Modal>}
  </main>;
}
