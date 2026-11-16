import { courses, period, TUTORIAL_LAST_WEEK } from '../../domain/catalog.js';
import { balance } from '../../domain/balance.js';

const REST = ['sleep', 'exercise', 'game', 'out'];
const ran = (state, test) => state.history.some((entry) => entry.actions.some(test));
const mathStudy = (slot) => slot.activity === 'study' && courses[slot.target]?.ability === 'math';

// Lessons can be finished in any order during the practice window (winter week to
// TUTORIAL_LAST_WEEK). Evidence from any week counts, so practising "한 주 진행" early
// does not close the lessons that are still open.
export function tutorialCompletion(state, visited = []) {
  const seen = (id) => visited.includes(id);
  return {
    profile: seen('stats') && seen('courses'),
    schedule:
      Boolean(state.flags.tutorialStudy) &&
      (state.tasks['first-study']?.status === 'completed' ||
        state.plan.some(mathStudy) ||
        ran(state, mathStudy)),
    tasks:
      Boolean(state.flags.tutorialTask) && state.tasks['practice-report']?.status === 'completed',
    recovery:
      Boolean(state.flags.tutorialRecovery) &&
      (state.plan.some((slot) => REST.includes(slot.activity)) ||
        ran(state, (slot) => REST.includes(slot.activity))),
    notices: seen('notices') && (seen('study-event') || Boolean(state.choices.winter_study)),
    resources: seen('shop'),
    calendar: seen('calendar:4'),
    results: state.history.length > 0 && seen('result-read'),
  };
}
// The practice window is still open and something is left to do.
export const tutorialOpen = (state, count, total) =>
  state.week === 0 || (state.week <= TUTORIAL_LAST_WEEK && count < total);
export const TUTORIAL_UNTIL = period(TUTORIAL_LAST_WEEK).label.split(' · ')[0];

const { fatigue, recovery, money, weekly } = balance;
export const TUTORIAL_LESSONS = [
  {
    id: 'profile',
    title: '과목과 능력치',
    target: 'stats',
    action: '능력치 보기',
    description:
      '공부하면 공통 능력과 선택한 과목의 이해도가 함께 오릅니다. 왼쪽에서 능력치를, 수강 과목에서 이해도와 평가별 성적을 확인할 수 있습니다.',
    practice: '능력치와 수강 과목을 각각 열어 어떤 능력을 공부에 쓰는지 확인하세요.',
  },
  {
    id: 'schedule',
    title: '자습 신청',
    target: 'schedule',
    action: '일정 열기',
    description:
      '월요일부터 일요일까지 아침 자습·1자·2자를 편성합니다. 시간 칸을 눌러 활동과 과목을 고르세요. 제목 옆에는 지금 시기가, 실행 버튼 위에는 이 계획대로 보낸 주말의 체력·스트레스 예상이 나옵니다.',
    practice: '수학 공부를 한 칸 배정하고 주말 예상이 어떻게 바뀌는지 보세요.',
  },
  {
    id: 'tasks',
    title: '할 일과 마감',
    target: 'tasks',
    action: '과제 배정하기',
    description:
      '할 일을 자습시간에 배정하고 한 주를 진행하면 그 시간에 미니게임으로 작업합니다. 보고서는 목차 맞추기, 실험은 변인 통제, 문제 만들기는 배점 맞추기처럼 과제마다 방식이 다르고, 과목 이해도가 높을수록 쉬워집니다. 필요한 작업을 마치면 그 자리에서 완료됩니다.',
    practice: `연습 보고서를 두 칸 배정하고 한 주를 진행해 직접 작업해 보세요. 연습 과제는 ${TUTORIAL_UNTIL}까지 남아 있고, 못 끝내도 불이익이 없습니다.`,
  },
  {
    id: 'recovery',
    title: '휴식과 컨디션',
    target: 'slot',
    action: '휴식 넣어보기',
    description: `공부하면 체력이 줄고 스트레스가 쌓입니다. 쉬는 활동은 한 주에 ${recovery.freeSlots}칸까지만 효과가 온전합니다. 주말 스트레스가 ${fatigue.strainStress} 이상이면 지침, ${fatigue.tiredStress} 이상이면 피로, ${fatigue.burnoutStress} 이상이면 번아웃이 되어 다음 주 공부 효율이 떨어지고, 한 주에 한 단계씩만 회복합니다. 체력이 낮아도 같습니다. 시험·원서 시기에는 같은 공부도 더 지칩니다.`,
    practice: '자습 한 칸을 호실 휴식이나 운동으로 바꾸고 주말 예상을 비교하세요.',
  },
  {
    id: 'notices',
    title: '알림과 스터디',
    target: 'notices',
    action: '알림 열기',
    description:
      '종 아이콘에 점이 생기면 새 소식이 있습니다. 모집 공고를 열어 스터디를 고르거나 나중에 결정할 수 있습니다. 친구들 소식도 소문으로 이곳에 옵니다.',
    practice: '스터디 모집 공고에서 합류 확률과 팀의 효과를 비교하세요.',
  },
  {
    id: 'resources',
    title: '용돈과 매점',
    target: 'shop',
    action: '매점 보기',
    description: `용돈은 매달 첫 주에 ${money.monthlyAllowance.toLocaleString()}원이 들어오고, 생활비로 매주 ${weekly.livingCost.toLocaleString()}원이 나갑니다. 매점 상품은 사는 즉시 사용하고, 학원·외출에도 돈이 듭니다. 아르바이트는 방학에만 할 수 있습니다.`,
    practice: '상품의 가격을 확인하세요. 구매는 선택입니다.',
  },
  {
    id: 'calendar',
    title: '시험과 학사 일정',
    target: 'calendar',
    action: '달력 열기',
    description:
      '달력에서 과제·퀴즈·시험 주차를 확인합니다. 시험은 그 주까지 쌓인 능력과 컨디션으로 평가됩니다. 시험 전 몇 주는 부담이 커지니 미리 쉬는 칸도 계획하세요.',
    practice: '4월을 선택해 중간고사 시기를 확인하세요.',
  },
  {
    id: 'results',
    title: '한 주 진행과 결과',
    target: 'confirm',
    action: '이번 주 진행',
    description:
      '한 주 진행을 누르면 편성한 활동을 시간순으로 처리하고, 과제 시간에는 미니게임을 합니다. 결과에서 이전 수치·변화량·완료 과제·컨디션을 확인합니다.',
    practice: `일정을 확인한 뒤 한 주를 진행하고 결과를 읽어 보세요. 남은 단원은 ${TUTORIAL_UNTIL}까지 이어서 할 수 있습니다.`,
  },
];
