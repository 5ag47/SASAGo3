import { useEffect } from 'react';
import { TUTORIAL_LESSONS } from './tutorial.js';
const locations = {
  stats: '왼쪽 능력치 상자의 ↗ 버튼을 눌러보세요.',
  courses: '아래 메뉴에서 수강 과목을 찾아보세요. 좁은 화면에서는 더보기 안에 있습니다.',
  schedule: '자습 신청의 시간 칸을 직접 눌러보세요. 좁은 화면에서는 아래 자습 버튼으로 엽니다.',
  slot: '자습 신청에서 시간 칸을 눌러 호실이나 운동을 골라보세요.',
  tasks: '왼쪽 할 일 목록에서 연습 보고서를 열고, 일정에 두 칸을 배정해보세요.',
  notices: '오른쪽 위 종 아이콘을 눌러 모집 공고를 찾아보세요.',
  shop: '아래 메뉴에서 매점을 찾아 가격과 효과를 확인해보세요.',
  calendar: '왼쪽 아래 달력 버튼을 눌러 4월 일정을 찾아보세요.',
  confirm: '자습 신청 아래 한 주 진행 버튼을 찾아보세요.',
  records: '아래 기록 메뉴에서 겨울방학 결과를 찾아보세요.',
};
export default function TutorialGuide({ tutorial, state, modal, onHelp, onDismiss }) {
  const lesson = TUTORIAL_LESSONS.find((lesson) => lesson.id === tutorial.active);
  const target =
    lesson?.id === 'profile' &&
    tutorial.visited.includes('stats') &&
    !tutorial.visited.includes('courses')
      ? 'courses'
      : lesson?.id === 'results' && state.week > 0
        ? 'records'
        : lesson?.target;
  useEffect(() => {
    if (!target) return;
    let node;
    function locate() {
      node?.classList.remove('tutorial-target');
      const visible = (selector) =>
        [...document.querySelectorAll(selector)].find((item) => item.getClientRects().length);
      node = visible('[data-tutorial="' + target + '"]');
      if (!node && ['slot', 'schedule', 'confirm'].includes(target))
        node = visible('[data-tutorial="schedule"]');
      if (!node) node = document.querySelector('[data-tutorial="menu"]');
      node?.classList.add('tutorial-target');
    }
    locate();
    window.addEventListener('resize', locate);
    return () => {
      node?.classList.remove('tutorial-target');
      window.removeEventListener('resize', locate);
    };
  }, [target, modal, state.week]);
  if (!lesson || modal) return null;
  return (
    <aside className="tutorial-guide" aria-label="직접 조작 안내">
      <b>{lesson.title}</b>
      <p>
        {tutorial.completed[lesson.id]
          ? '확인했습니다. 다른 단원도 원하는 순서로 연습할 수 있습니다.'
          : locations[target]}
      </p>
      <div>
        <button onClick={onHelp}>단원 목록</button>
        <button onClick={onDismiss}>안내 닫기</button>
      </div>
    </aside>
  );
}
