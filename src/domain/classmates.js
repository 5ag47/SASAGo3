// Classmates: fixed, authored people whose news and applications make the year feel shared.
// Everything is data in data/classmates.json. Rumors fire on their week (checked once, like
// events), use the same bounded conditions, and draw no random numbers, so balance is unchanged.
import data from '../../data/classmates.json' with { type: 'json' };
import { MAJORS, STATS } from './catalog.js';
import { conditionIssues, matchesCondition } from './conditions.js';
import { applyEffects } from './random.js';
import { notice } from './notifications.js';
import { ADMISSION_DIRECTIONS } from './school-record.js';

export const CLASSMATE_ROUTES = Object.freeze({
  top_interview: '서울대 종합',
  kaist_postech: '카이스트·포스텍 종합',
  korea_university: '고대 종합',
  essay: '연논 논술',
  regular: '정시',
});
export const classmateData = data;
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const week = (value) => Number.isInteger(value) && value >= 0 && value <= 40;

// Korean messages name the exact field so a teammate editing the JSON can fix it directly.
export function classmateIssues(value = data, context = {}) {
  const issues = [];
  const add = (path, message) => issues.push(`${path}: ${message}`);
  if (!plain(value)) return ['classmates.json: 객체가 필요합니다.'];
  const school = value.school;
  if (!plain(school)) add('school', '객체가 필요합니다.');
  else {
    if (!week(school.boardWeek)) add('school.boardWeek', '0~40 정수(원서 현황을 보여 줄 주)');
    if (!week(school.resultWeek)) add('school.resultWeek', '0~40 정수(동기 결과를 알려 줄 주)');
    if (!plain(school.otherApplicants))
      add('school.otherApplicants', '전형별 숫자 객체가 필요합니다.');
    else
      for (const [route, count] of Object.entries(school.otherApplicants)) {
        if (!Object.hasOwn(CLASSMATE_ROUTES, route))
          add(
            `school.otherApplicants.${route}`,
            `알 수 없는 전형. ${Object.keys(CLASSMATE_ROUTES).join(', ')} 중 하나`,
          );
        if (!Number.isInteger(count) || count < 0 || count > 300)
          add(`school.otherApplicants.${route}`, '0~300 정수');
      }
  }
  if (!plain(value.classmates) || !Object.keys(value.classmates).length)
    return [...issues, 'classmates: 한 명 이상 필요합니다.'];
  const rumorIds = new Set();
  for (const [id, mate] of Object.entries(value.classmates)) {
    const path = `classmates.${id}`;
    if (!/^[a-z][a-z0-9_-]{1,39}$/.test(id)) add(path, 'ID는 영어 소문자로 시작하는 2~40자');
    if (!plain(mate)) {
      add(path, '객체가 필요합니다.');
      continue;
    }
    const known = ['name', 'relation', 'major', 'profile', 'routes', 'result', 'rumors', 'enabled'];
    for (const key of Object.keys(mate))
      if (!known.includes(key)) add(`${path}.${key}`, '알 수 없는 항목');
    if (mate.enabled !== undefined && typeof mate.enabled !== 'boolean')
      add(`${path}.enabled`, 'true 또는 false');
    if (!text(mate.name, 10)) add(`${path}.name`, '1~10자');
    if (!text(mate.relation, 10)) add(`${path}.relation`, '1~10자 (예: 룸메이트, 같은 반)');
    if (!Object.hasOwn(context.majors ?? MAJORS, mate.major))
      add(`${path}.major`, `전공 ID. ${Object.keys(context.majors ?? MAJORS).join(', ')} 중 하나`);
    if (!text(mate.profile, 60)) add(`${path}.profile`, '1~60자 한 줄 소개');
    if (
      !Array.isArray(mate.routes) ||
      new Set(mate.routes).size !== mate.routes.length ||
      mate.routes.some((route) => !Object.hasOwn(CLASSMATE_ROUTES, route))
    )
      add(`${path}.routes`, `지원 전형 목록. ${Object.keys(CLASSMATE_ROUTES).join(', ')} 중에서`);
    if (
      !plain(mate.result) ||
      typeof mate.result.accepted !== 'boolean' ||
      !text(mate.result.text, 80)
    )
      add(`${path}.result`, '{ "accepted": true/false, "text": "1~80자" }');
    if (!Array.isArray(mate.rumors)) {
      add(`${path}.rumors`, '배열이 필요합니다. 없으면 []');
      continue;
    }
    mate.rumors.forEach((rumor, index) => {
      const at = `${path}.rumors[${index}]`;
      if (!plain(rumor)) return add(at, '객체가 필요합니다.');
      for (const key of Object.keys(rumor))
        if (!['id', 'week', 'text', 'when', 'effect'].includes(key))
          add(`${at}.${key}`, '알 수 없는 항목');
      if (!/^[a-z][a-z0-9_-]{1,59}$/.test(rumor.id ?? ''))
        add(`${at}.id`, '영어 소문자로 시작하는 고유 ID');
      else if (rumorIds.has(rumor.id)) add(`${at}.id`, `다른 소문과 겹침: ${rumor.id}`);
      else rumorIds.add(rumor.id);
      if (!week(rumor.week)) add(`${at}.week`, '0~40 정수');
      if (!text(rumor.text, 120)) add(`${at}.text`, '1~120자');
      if (rumor.when !== undefined)
        for (const issue of conditionIssues(rumor.when, context)) add(`${at}.when`, issue);
      if (rumor.effect !== undefined) {
        if (
          !plain(rumor.effect) ||
          Object.entries(rumor.effect).some(
            ([stat, amount]) =>
              !Object.hasOwn(STATS, stat) || !Number.isFinite(amount) || Math.abs(amount) > 10,
          )
        )
          add(`${at}.effect`, `능력치 ID와 -10~10 숫자. ${Object.keys(STATS).join(', ')}`);
      }
    });
  }
  return issues;
}

const activeMates = () =>
  Object.entries(data.classmates).filter(([, mate]) => mate.enabled !== false);

// Called once at the start of each week. A rumor is checked on its week and never again.
export function deliverClassmateNews(state) {
  state.flags.rumors ??= {};
  for (const [, mate] of activeMates())
    for (const rumor of mate.rumors) {
      if (rumor.week !== state.week || state.flags.rumors[rumor.id]) continue;
      state.flags.rumors[rumor.id] = true;
      if (!matchesCondition(state, rumor.when)) continue;
      if (rumor.effect) applyEffects(state, rumor.effect);
      notice(state, `${mate.name} 소식`, rumor.text, 'rumor');
    }
  if (state.week === data.school.resultWeek && !state.flags.rumors['class-results']) {
    state.flags.rumors['class-results'] = true;
    const accepted = activeMates().filter(([, mate]) => mate.result.accepted).length;
    notice(
      state,
      '동기들의 결과',
      `친구들 ${activeMates().length}명 중 ${accepted}명이 합격 소식을 전했다. 진학실에서 볼 수 있다.`,
      'rumor',
    );
  }
}

export function playerRoutes(state) {
  const direction = state.documents?.direction ?? state.flags.target;
  return [
    ...(ADMISSION_DIRECTIONS[direction]?.routes ?? []),
    'essay',
    ...(state.flags.csat === 'prepare' ? ['regular'] : []),
  ];
}
export function applicationBoard(state) {
  if (state.week < data.school.boardWeek) return null;
  const mine = playerRoutes(state);
  return Object.entries(CLASSMATE_ROUTES).map(([id, label]) => {
    const mates = activeMates()
      .filter(([, mate]) => mate.routes.includes(id))
      .map(([, mate]) => mate.name);
    const you = mine.includes(id);
    return {
      id,
      label,
      mates,
      you,
      total: (data.school.otherApplicants[id] ?? 0) + mates.length + Number(you),
    };
  });
}
export const classmateResults = (state) =>
  state.week < data.school.resultWeek
    ? null
    : activeMates().map(([id, mate]) => ({
        id,
        name: mate.name,
        relation: mate.relation,
        ...mate.result,
      }));
export const classmateList = () =>
  activeMates().map(([id, mate]) => ({
    id,
    name: mate.name,
    relation: mate.relation,
    major: MAJORS[mate.major]?.name ?? mate.major,
    profile: mate.profile,
  }));
