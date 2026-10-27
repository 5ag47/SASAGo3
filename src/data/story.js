// Fictional school-life scenarios, not the school's official calendar.
export const STORIES = [{
  title: '새 학기, 새로운 책상',
  speaker: '룸메이트',
  text: '드디어 고3 2학기네. 이번 주는 어떻게 시작할래?',
  choices: [{
    label: '함께 공부할 친구를 모은다',
    effect: {
      reputation: 3,
      focus: 2
    },
    outcome: '작은 스터디가 생겼다. 혼자 할 때보다 마음이 놓인다.'
  }, {
    label: '내 페이스부터 찾는다',
    effect: {
      hp: 3,
      stress: -4
    },
    outcome: '책상을 정리하고 푹 쉬었다. 이번 학기는 천천히 시작하자.'
  }]
}, {
  title: '친구의 어려운 문제',
  speaker: '같은 반 친구',
  text: '이 문제, 어디서부터 시작해야 할지 모르겠어. 같이 볼래?',
  choices: [{
    label: '풀이를 함께 고민한다',
    effect: {
      reputation: 4,
      math: 2,
      hp: -2
    },
    outcome: '설명하다 보니 나도 개념이 정리됐다. 친구가 고맙다고 웃었다.'
  }, {
    label: '내 공부가 끝난 뒤 힌트를 건넨다',
    effect: {
      reputation: 1,
      focus: 2
    },
    outcome: '서로의 시간을 존중하면서도 도움을 줄 수 있었다.'
  }]
}, {
  title: '불 꺼진 기숙사',
  speaker: '나',
  text: '문제가 아직 남았다. 눈꺼풀은 점점 무거워진다.',
  choices: [{
    label: '소등 시간을 지키고 잠든다',
    effect: {
      hp: 6,
      stress: -3
    },
    outcome: '아침에 다시 보니 막혔던 풀이가 조금씩 보인다.'
  }, {
    label: '몰래 공부를 계속한다 · 벌금 1,000원',
    effect: {
      math: 3,
      hp: -6,
      reputation: -3,
      stress: 4
    },
    fine: 1000,
    outcome: '몇 문제 더 풀었지만 소등 규칙을 어겨 벌금이 부과됐다.'
  }]
}, {
  title: '첫 번째 실전 연습',
  speaker: '담임 선생님',
  text: '오늘은 모의 평가 날이다. 결과보다 준비 과정이 중요하다.',
  assessment: true,
  choices: [{
    label: '차분하게 풀이 과정을 정리한다',
    effect: {
      focus: 3,
      stress: -2
    },
    outcome: '틀린 문제를 오답노트에 남겼다. 다음에 무엇을 공부할지 알게 됐다.'
  }, {
    label: '친구들과 서로 피드백한다',
    effect: {
      reputation: 3,
      science: 2
    },
    outcome: '다른 풀이를 보며 내 사고의 빈틈을 발견했다.'
  }]
}, {
  title: '주말의 운동장',
  speaker: '룸메이트',
  text: '오늘 하늘 정말 좋다. 잠깐 밖에 나갈래?',
  choices: [{
    label: '같이 운동장을 걷는다',
    effect: {
      hp: 4,
      reputation: 2,
      stress: -5
    },
    outcome: '별것 아닌 이야기를 나누며 긴장이 풀렸다.'
  }, {
    label: '조용히 음악을 들으며 쉰다',
    effect: {
      focus: 4,
      stress: -4
    },
    outcome: '혼자 보내는 시간도 꽤 괜찮다.'
  }]
}, {
  title: '스터디 발표 담당',
  speaker: '스터디 친구',
  text: '이번에는 네가 주요선택 과목을 설명해줄래?',
  choices: [{
    label: '발표를 맡아 준비한다',
    effect: {
      science: 3,
      reputation: 3,
      stress: 4
    },
    outcome: '준비는 힘들었지만 설명을 마치고 나니 자신감이 생겼다.'
  }, {
    label: '자료 정리를 맡는다',
    effect: {
      science: 2,
      focus: 2
    },
    outcome: '보이지 않는 곳에서도 팀에 기여할 수 있었다.'
  }]
}, {
  title: '뜻밖의 빈 시간',
  speaker: '나',
  text: '예정보다 일찍 할 일을 마쳤다. 작은 여유가 생겼다.',
  choices: [{
    label: '가족에게 전화한다',
    effect: {
      stress: -6,
      focus: 2
    },
    outcome: '익숙한 목소리를 듣자 마음이 한결 가벼워졌다.'
  }, {
    label: '새로운 수학 문제에 도전한다',
    effect: {
      math: 3,
      focus: -1
    },
    outcome: '쉽지는 않았지만 새로운 접근을 배웠다.'
  }]
}, {
  title: '중간 점검',
  speaker: '담임 선생님',
  text: '절반을 잘 지나왔구나. 이제 균형을 다시 살펴보자.',
  assessment: true,
  choices: [{
    label: '생활 리듬을 재정비한다',
    effect: {
      hp: 5,
      focus: 3,
      stress: -3
    },
    outcome: '무리하는 시간을 줄이고 꾸준히 할 수 있는 계획을 세웠다.'
  }, {
    label: '약한 개념을 집중 점검한다',
    effect: {
      math: 2,
      science: 2,
      stress: 2
    },
    outcome: '점수 뒤에 숨어 있던 빈틈을 찾아냈다.'
  }]
}, {
  title: '응원의 쪽지',
  speaker: '같은 반 친구',
  text: '책상 위에 작은 쪽지가 놓여 있다. “조금만 더 힘내자!”',
  choices: [{
    label: '친구에게도 응원을 전한다',
    effect: {
      reputation: 4,
      stress: -3
    },
    outcome: '응원은 나누면 더 커지는 것 같다.'
  }, {
    label: '쪽지를 책상에 붙인다',
    effect: {
      focus: 4,
      stress: -3
    },
    outcome: '지칠 때마다 다시 읽을 문장이 생겼다.'
  }]
}, {
  title: '마지막 고비',
  speaker: '나',
  text: '시간이 얼마 남지 않았다. 많이 하는 것과 잘하는 것 사이에서 고민한다.',
  choices: [{
    label: '수학의 기본으로 돌아간다',
    effect: {
      math: 4,
      stress: 2
    },
    outcome: '새 문제보다 익숙한 개념을 단단하게 만들었다.'
  }, {
    label: '주요선택 과목을 정리한다',
    effect: {
      science: 4,
      stress: 2
    },
    outcome: '흩어진 지식이 하나의 흐름으로 이어졌다.'
  }]
}, {
  title: '평가 전날 밤',
  speaker: '룸메이트',
  text: '여기까지 정말 수고했다. 내일은 평소대로만 하자.',
  choices: [{
    label: '일찍 잠자리에 든다',
    effect: {
      hp: 7,
      focus: 3,
      stress: -5
    },
    outcome: '가방을 챙겨두고 불을 껐다. 할 만큼 했다.'
  }, {
    label: '가벼운 복습으로 마무리한다',
    effect: {
      math: 2,
      science: 2,
      stress: -2
    },
    outcome: '핵심만 확인하고 책을 덮었다. 이제 나를 믿자.'
  }]
}, {
  title: '우리의 2학기',
  speaker: '담임 선생님',
  text: '마지막 평가가 끝났다. 이 시간은 너에게 무엇으로 남을까?',
  assessment: true,
  choices: [{
    label: '함께한 친구들에게 인사한다',
    effect: {
      reputation: 4,
      stress: -8
    },
    outcome: '점수만으로는 다 담을 수 없는 추억이 생겼다.'
  }, {
    label: '다음 목표를 노트에 적는다',
    effect: {
      focus: 4,
      stress: -6
    },
    outcome: '한 학기를 마쳤다. 다음 이야기는 내가 써나갈 차례다.'
  }]
}];
export const SEMESTER_WEEKS = STORIES.length;
export const storyForWeek = week => STORIES[Math.min(week, STORIES.length - 1)];
export function endingFor(stats) {
  if (stats.math >= 80 && stats.science >= 75 && stats.hp >= 40) return '단단하게 성장한 탐구자';
  if (stats.reputation >= 70) return '함께 빛나는 동료';
  if (stats.hp >= 70 && stats.stress <= 35) return '나의 페이스를 찾은 사람';
  return '끝까지 걸어온 도전자';
}
