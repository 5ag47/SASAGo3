import { Backpack, ChevronRight, ClipboardList, CalendarDays, FlaskConical, Play, ShoppingBag, Wallet } from 'lucide-react';
const MENU = [[CalendarDays, '이번 주', 'calendar'], [ClipboardList, '기록', 'records'], [FlaskConical, '능력치', 'stats'], [Backpack, '가방', 'bag'], [ShoppingBag, '매점', 'shop']];
export default function GameBottom({
  money,
  ended,
  onOpen,
  onStartWeek
}) {
  return <footer className="game-bottom">
      <nav aria-label="게임 메뉴">
        {MENU.map(([Icon, label, value]) => <button key={value} onClick={() => onOpen(value)}>
            <Icon size={22} strokeWidth={1.65} /><span>{label}</span>
          </button>)}
      </nav>
      <div className="bottom-right">
        <div className="allowance">
          <Wallet size={17} />
          <span>나의 용돈<b>{money.toLocaleString('ko-KR')} <small>원</small></b></span>
        </div>
        <button className="start-week" onClick={onStartWeek}>
          <Play size={22} fill="currentColor" />
          <span>{ended ? '학기 기록' : '한 주 시작'}<small>{ended ? '우리의 이야기 돌아보기' : '이번 주 계획 확인하기'}</small></span>
          <ChevronRight size={22} />
        </button>
      </div>
    </footer>;
}
