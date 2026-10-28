import { LAST_WEEK } from './catalog.js';
export const ENDINGS = {
  university: {
    title: '대학 진학',
    subtitle: '합격',
    description: '합격 통지서가 도착했다. 다음 봄에는 새로운 학교로 간다.',
  },
  retry: {
    title: '재도전',
    subtitle: '다시 도전하는 겨울',
    description: '입시를 한 해 더 준비하기로 했다. 올해의 기록을 정리하고 새 계획을 세운다.',
  },
  work: {
    title: '아르바이트',
    subtitle: '첫 출근',
    description: '일을 시작하기로 했다. 첫 월급이 들어오면 뭘 할지 생각 중이다.',
  },
  startup: {
    title: '창업',
    subtitle: '프로젝트 출시',
    description: '학교에서 만들던 프로젝트를 출시했다. 이제 과제 마감 대신 고객의 연락을 기다린다.',
  },
  prison: {
    title: '감옥',
    subtitle: '위험한 편법의 결말',
    description: '편법이 들통났다. 게임 속 과장된 결말이지만, 이번 기록은 여기서 끝난다.',
  },
  leave: {
    title: '휴학',
    subtitle: '학업 중단',
    description: '학업을 잠시 멈추기로 했다. 지금까지의 기록은 보관한다.',
  },
};
export function endingAvailable(state, id) {
  if (id === 'leave') return true;
  if (state.week <= LAST_WEEK) return false;
  if (state.discipline >= 5 && state.choices.temptation === 'cheat') return id === 'prison';
  if (id === 'prison') return false;
  if (id === 'university') return state.admissions.some((a) => a.accepted);
  if (id === 'startup') return state.stats.science >= 55 && state.stats.reputation >= 40;
  return ['retry', 'work'].includes(id);
}
