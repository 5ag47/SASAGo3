import { nextEvent } from '../../game.js';
import { storyForWeek } from '../../data/story.js';
import { conditionNote } from '../../data/dialogue.js';
export default function NoticeModal({
  game,
  onClose
}) {
  const event = nextEvent(game.week),
    last = game.history.at(-1);
  return <div className="phone"><div className="phone-status">SASA TALK <span>{game.ended ? '학기 종료' : `${game.week + 1}주차`}</span></div>
    <article className="phone-message"><small>담임 선생님 · 학사 안내</small><h3>{game.ended ? '한 학기 수고했어!' : storyForWeek(game.week).title}</h3><p>{game.ended ? '기록에서 그동안의 활동과 학기 결과를 돌아보세요.' : event ? `${event.label}까지 ${event.days}일. 공부와 휴식을 고르게 배치해보자.` : '이번 주도 자신의 페이스를 지켜보자.'}</p></article>
    <article className="phone-message"><small>룸메이트 · 방금</small><p>{game.stats.stress >= 70 ? '요즘 많이 지쳐 보이네. 매점 갔다가 좀 쉴까?' : game.stats.hp < 30 ? '오늘은 일찍 자자. 침대가 기다려!' : '이번 주도 같이 잘 보내보자. 운동장 한 바퀴 어때?'}</p><span className="soft-tag">{conditionNote(game.stats)}</span></article>
    {last?.economy && <article className="phone-message"><small>용돈 알림 · 지난 주</small><p>{last.economy.net.toLocaleString('ko-KR')}원 정산 완료 · 현재 {game.money.toLocaleString('ko-KR')}원</p><p>{last.story?.outcome}</p></article>}
    <button className="primary full-width" onClick={onClose}>읽었어요</button>
  </div>;
}
