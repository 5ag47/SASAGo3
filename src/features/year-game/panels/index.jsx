import planning from './planning.jsx';
import school from './school.jsx';
import narrative from './narrative.jsx';
import system from './system.jsx';
export { NAV } from './navigation.js';
export const PANELS = Object.freeze({
  slot: { title: '자습 신청', wide: false, View: planning },
  schedule: { title: '주간 일정', wide: true, View: planning },
  confirm: { title: '한 주 진행', wide: false, View: planning },
  running: { title: '주간 일정 진행', wide: false, View: planning },
  tasks: { title: '할 일', wide: true, View: school },
  taskGame: { title: '과제 미니게임', wide: false, View: school },
  stats: { title: '능력치', wide: false, View: school },
  courses: { title: '수강 과목·성적', wide: true, View: school },
  calendar: { title: '학사 달력', wide: true, View: school },
  group: { title: '스터디', wide: false, View: school },
  admissions: { title: '입시 결과', wide: true, View: school },
  yearReport: { title: '한 해 결산', wide: false, View: school },
  events: { title: '알림', wide: false, View: narrative },
  story: { title: '학교 이야기', wide: false, View: narrative },
  notices: { title: '알림', wide: false, View: narrative },
  records: { title: '기록', wide: true, View: narrative },
  result: { title: '주간 결과', wide: true, View: narrative },
  shop: { title: '매점', wide: false, View: system },
  settings: { title: '설정', wide: false, View: system },
  help: { title: '도움말', wide: true, View: system },
  tutorial: { title: '첫 주 연습', wide: true, View: system },
  menu: { title: '메뉴', wide: false, View: system },
  leave: { title: '휴학', wide: false, View: system },
});
export const panelDefinition = (type) => PANELS[type] ?? { title: '', wide: false };
export function GamePanel({ context }) {
  const View = panelDefinition(context.modal.type).View;
  return View ? <View {...context} /> : null;
}
