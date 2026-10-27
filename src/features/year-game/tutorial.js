import { courses } from '../../domain/catalog.js';

export function tutorialCompletion(state, visited = []) {
  const seen = (id) => visited.includes(id);
  const firstWeek = state.history.find((entry) => entry.week === 0);
  return {
    profile: seen('stats') && seen('courses'),
    schedule:
      Boolean(state.flags.tutorialStudy) &&
      (state.tasks['first-study']?.status === 'completed' ||
        state.plan.some(
          (slot) => slot.activity === 'study' && courses[slot.target]?.ability === 'math',
        )),
    tasks:
      Boolean(state.flags.tutorialTask) &&
      (state.tasks['practice-report']?.status === 'completed' ||
        state.plan.filter((slot) => slot.activity === 'task' && slot.target === 'practice-report')
          .length >= 2),
    recovery:
      Boolean(state.flags.tutorialRecovery) &&
      (state.plan.some((slot) => ['sleep', 'exercise', 'game', 'out'].includes(slot.activity)) ||
        Boolean(
          firstWeek?.actions.some((slot) =>
            ['sleep', 'exercise', 'game', 'out'].includes(slot.activity),
          ),
        )),
    notices: seen('notices') && (seen('study-event') || Boolean(state.choices.winter_study)),
    resources: seen('shop'),
    calendar: seen('calendar:4'),
    results: Boolean(firstWeek) && seen('result-read'),
  };
}
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
      '월요일부터 일요일까지 아침 자습·1자·2자를 편성합니다. 시간 칸을 눌러 활동과 과목을 고르고 신청하세요.',
    practice: '수학 공부를 한 칸 배정해 보세요. 다른 칸은 원하는 활동으로 바꿀 수 있습니다.',
  },
  {
    id: 'tasks',
    title: '할 일과 마감',
    target: 'tasks',
    action: '과제 배정하기',
    description:
      '과제를 눌러 시간을 배정합니다. 한 주가 끝날 때 진행도가 오르고, 목표에 도달하면 자동으로 완료됩니다.',
    practice: '연습 보고서에 두 칸을 배정하고, 과제 창의 배정 칸 수를 확인하세요.',
  },
  {
    id: 'recovery',
    title: '휴식과 스트레스',
    target: 'slot',
    action: '휴식 넣어보기',
    description:
      '공부하면 체력이 줄고 스트레스가 쌓입니다. 체력이 25 미만이거나 스트레스가 80 이상으로 한 주를 마치면 다음 주에 피로가 남습니다.',
    practice: '자습 한 칸을 호실 휴식이나 운동으로 바꾸고 효과를 확인하세요.',
  },
  {
    id: 'notices',
    title: '알림과 스터디',
    target: 'notices',
    action: '알림 열기',
    description:
      '종 아이콘에 점이 생기면 새 소식이 있습니다. 모집 공고를 열어 스터디를 고르거나 나중에 결정할 수 있습니다.',
    practice: '스터디 모집 공고에서 합류 확률과 팀의 효과를 비교하세요.',
  },
  {
    id: 'resources',
    title: '용돈과 매점',
    target: 'shop',
    action: '매점 보기',
    description:
      '매점 상품은 구매 즉시 사용합니다. 학원·외출도 용돈이 필요합니다. 잔액은 화면 아래에 표시됩니다.',
    practice: '상품의 가격을 확인하세요. 구매는 선택입니다.',
  },
  {
    id: 'calendar',
    title: '시험과 학사 일정',
    target: 'calendar',
    action: '달력 열기',
    description:
      '달력에서 과제·퀴즈·시험 주차를 확인합니다. 시험은 해당 주까지 쌓인 능력과 컨디션으로 평가됩니다.',
    practice: '4월을 선택해 중간고사 시기를 확인하세요.',
  },
  {
    id: 'results',
    title: '한 주 진행과 결과',
    target: 'confirm',
    action: '이번 주 진행',
    description:
      '한 주 진행을 누르면 편성한 활동을 시간순으로 처리합니다. 결과에서 이전 수치·변화량·완료 과제를 확인합니다.',
    practice: '일정을 확인한 뒤 한 주를 진행하세요. 이후 도움말에서 기록을 다시 볼 수 있습니다.',
  },
];
