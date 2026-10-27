export const DAYS = ['월', '화', '수', '목', '금', '토'];

// effect: 활동 1회(하루)당 능력치 변화량. 학습 능력치(SKILL_KEYS)의 양수 값만 효율 보정을 받는다.
export const ACTIVITIES = {
  math: {
    label: '수학', type: 'study', place: '학습실', reason: '수학 심층 공부',
    effect: { math: 3, hp: -2, focus: -1, stress: 3 },
  },
  science: {
    label: '물리', type: 'science', place: '학습실', reason: '물리 심층 공부',
    effect: { science: 3, hp: -2, focus: -1, stress: 3 },
  },
  interview: {
    label: '면접', type: 'interview', place: '스터디실', reason: '모의 면접',
    effect: { speech: 3, reputation: 1, hp: -1, stress: 3 },
  },
  write: {
    label: '자소서', type: 'write', place: '도서관', reason: '원서 작성',
    effect: { writing: 3, hp: -1, focus: -1, stress: 2 },
  },
  rest: {
    label: '요양', type: 'rest', place: '호실(요양)', reason: '잠자기',
    effect: { hp: 6, focus: 3, stress: -4 },
  },
  game: {
    label: '게임', type: 'rest', place: '호실(요양)', reason: '게임',
    effect: { hp: -1, focus: -2, stress: -6 },
  },
  exercise: {
    label: '운동', type: 'exercise', place: '운동장', reason: '가볍게 운동',
    effect: { hp: 3, focus: 2, stress: -3 },
  },
};

export const SUNDAY_EFFECT = { hp: 4, stress: -3 };

export const LOCATIONS = [...new Set(Object.values(ACTIVITIES).map(activity => activity.place))];
