import { Check } from 'lucide-react';
import { weekDate } from '../../game.js';

export default function NoticeModal({ week, onClose }) {
  const date = weekDate(week);

  return (
    <>
      <article className="notice-message">
        <span className="soft-tag">일정 안내 · {date.getUTCMonth() + 1}월 {date.getUTCDate()}일</span>
        <h3>2학기 주요 일정</h3>
        <p>2학기에는 모의 면접과 원서 작성 일정이 있어요. 공부와 휴식 시간을 나눠서 한 주씩 계획하세요.</p>
        <p>월~토 활동을 신청하고 &lsquo;한 주 시작&rsquo;을 누르면 한 주가 지나가며 능력치가 바뀌어요. 일요일은 자동으로 쉽니다.</p>
      </article>
      <button className="primary full-width" onClick={onClose}>확인 <Check size={16} /></button>
    </>
  );
}
