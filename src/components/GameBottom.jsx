import { Backpack, ChevronRight, ClipboardList, CalendarDays, FlaskConical, Play, ShoppingBag, Wallet, Bell } from 'lucide-react';
const MENU = [[CalendarDays, '달력', 'calendar'], [ClipboardList, '기록', 'records'], [FlaskConical, '스탯', 'stats'], [Backpack, '가방', 'bag'], [ShoppingBag, '매점', 'shop']];
export default function GameBottom({
  money,
  ended,
  unread,
  onOpen,
  onStartWeek
}) {
  return <footer className="game-bottom">
    <nav aria-label="게임 메뉴">{MENU.map(([Icon, label, value]) => <button key={value} onClick={() => onOpen(value)}><Icon size={24} strokeWidth={1.65} /><span>{label}</span></button>)}</nav>
    <div className="bottom-right">
      <div className="allowance"><Wallet size={20} /><b>{money.toLocaleString('ko-KR')}원</b></div>
      <div className="week-actions">
        <button className="notification-button" aria-label={unread ? '알림 열기 (새 알림)' : '알림 열기'} onClick={() => onOpen('notice')}><Bell size={23} />{unread && <i />}</button>
        <button className="start-week" onClick={onStartWeek}><Play size={21} fill="currentColor" /><span>{ended ? '학기 기록' : '한 주 시작'}</span><ChevronRight size={21} /></button>
      </div>
    </div>
  </footer>;
}
