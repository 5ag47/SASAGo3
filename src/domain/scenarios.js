import { conditionIssues } from './conditions.js';

export const SCENARIO_SCHEMA_VERSION = 1;
const plain = (v) => v && typeof v === 'object' && !Array.isArray(v);
const number = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
const integer = (v, min, max) => Number.isInteger(v) && number(v, min, max);
const idValid = (v) =>
  typeof v === 'string' &&
  /^[a-z][a-z0-9_-]{1,79}$/.test(v) &&
  !['constructor', 'prototype', '__proto__'].includes(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 1000;
export const termOffset = (term) => ({ year: 0, semester_1: 0, summer: 16, semester_2: 24 })[term];
const termEnd = (term) => ({ year: 40, semester_1: 16, summer: 8, semester_2: 16 })[term];
export const effectMap = (list = []) =>
  list.reduce((out, e) => {
    out[e.stat] = (out[e.stat] ?? 0) + e.amount;
    return out;
  }, {});
function effectIssues(list, stats) {
  if (!Array.isArray(list) || list.length > 12) return ['효과는 12개 이하 배열이어야 합니다.'];
  return list.flatMap((e) =>
    !plain(e) ||
    Object.keys(e).some((k) => !['type', 'stat', 'amount'].includes(k)) ||
    e.type !== 'stat_delta' ||
    !Object.hasOwn(stats, e.stat) ||
    !number(e.amount, -100, 100)
      ? ['유효한 stat_delta가 필요합니다.']
      : [],
  );
}
export function workIssues(work, stats) {
  if (
    !plain(work) ||
    Object.keys(work).some((k) => !['targetProgress', 'perAction'].includes(k)) ||
    !number(work.targetProgress, 0.1, 100)
  )
    return ['과제 목표를 확인하세요.'];
  const a = work.perAction;
  if (
    !plain(a) ||
    Object.keys(a).some((k) => !['timeSlots', 'progress', 'cost', 'effects'].includes(k)) ||
    !integer(a.timeSlots, 1, 21) ||
    !number(a.progress, 0.1, 100) ||
    !plain(a.cost) ||
    Object.keys(a.cost).some((k) => k !== 'money') ||
    !integer(a.cost.money, 0, 1000000)
  )
    return ['과제 시간·진척·비용을 확인하세요.'];
  return effectIssues(a.effects, stats);
}
export function resolutionIssues(r, stats) {
  if (
    !plain(r) ||
    !['report_score', 'ability_score'].includes(r.rule) ||
    !plain(r.params) ||
    Object.keys(r).some((k) => !['rule', 'params'].includes(k))
  )
    return ['지원하는 결과 계산 규칙이 필요합니다.'];
  const p = r.params;
  if (
    Object.keys(p).some(
      (k) =>
        !['ability', 'base', 'abilityWeight', 'randomness', 'maxScore', 'expireScore'].includes(k),
    ) ||
    !Object.hasOwn(stats, p.ability) ||
    !number(p.base, 0, 100) ||
    !number(p.abilityWeight, 0, 2) ||
    !number(p.randomness, 0, 50) ||
    !number(p.maxScore, 1, 100) ||
    !number(p.expireScore, 0, 100)
  )
    return ['성적 계산 매개변수를 확인하세요.'];
  return [];
}
export function scenarioIssues(content, { courses, stats, majors } = {}) {
  if (
    !plain(content) ||
    content.schemaVersion !== SCENARIO_SCHEMA_VERSION ||
    !plain(content.events) ||
    Object.keys(content).some((k) => !['schemaVersion', 'events'].includes(k))
  )
    return ['시나리오 schemaVersion 또는 events가 올바르지 않습니다.'];
  const issues = [];
  for (const [id, e] of Object.entries(content.events)) {
    const fail = (msg) => issues.push(`${id}: ${msg}`);
    if (!idValid(id) || !plain(e)) {
      fail('잘못된 ID 또는 이벤트');
      continue;
    }
    if (
      Object.keys(e).some(
        (k) =>
          ![
            'id',
            'name',
            'description',
            'scope',
            'courseId',
            'kind',
            'trigger',
            'deadline',
            'work',
            'resolution',
            'grade',
            'effects',
            'options',
            'enabled',
            'outcomes',
          ].includes(k),
      )
    )
      fail('지원하지 않는 필드');
    if (e.id !== id || !text(e.name) || !text(e.description)) fail('ID·이름·설명 필요');
    if (
      !['common', 'course'].includes(e.scope) ||
      (e.scope === 'course' ? !Object.hasOwn(courses, e.courseId) : e.courseId !== undefined)
    )
      fail('범위와 과목 연결 확인');
    if (!['task', 'exam', 'choice', 'natural'].includes(e.kind)) fail('이벤트 종류 확인');
    if (e.enabled !== undefined && typeof e.enabled !== 'boolean') fail('enabled는 boolean');
    const t = e.trigger;
    if (
      !plain(t) ||
      Object.keys(t).some(
        (k) =>
          ![
            'type',
            'term',
            'week',
            'day',
            'phase',
            'probability',
            'maxOccurrencesPerTerm',
            'repeatEvery',
            'untilWeek',
            'when',
          ].includes(k),
      ) ||
      t.type !== 'scheduled' ||
      termOffset(t.term) === undefined ||
      !integer(t.week, t.term === 'year' ? 0 : 1, termEnd(t.term)) ||
      !integer(t.day, 0, 6) ||
      !['start', 'end'].includes(t.phase) ||
      !number(t.probability, 0, 1) ||
      !integer(t.maxOccurrencesPerTerm, 1, 41)
    ) {
      fail('발생 조건 확인');
      continue;
    }
    conditionIssues(t.when, { courses, stats, majors }).forEach(fail);
    if (
      t.repeatEvery !== undefined &&
      (!integer(t.repeatEvery, 1, 40) || !integer(t.untilWeek, t.week, termEnd(t.term)))
    )
      fail('반복 범위 확인');
    if (t.repeatEvery === undefined && t.untilWeek !== undefined) fail('반복 간격 필요');
    if (e.kind === 'task') {
      const d = e.deadline;
      if (
        !plain(d) ||
        Object.keys(d).some((k) => !['week', 'day', 'phase'].includes(k)) ||
        !integer(d.week, t.week, termEnd(t.term)) ||
        !integer(d.day, 0, 6) ||
        d.phase !== 'end' ||
        d.week * 7 + d.day < t.week * 7 + t.day ||
        (t.untilWeek ?? t.week) + d.week - t.week > termEnd(t.term)
      )
        fail('마감일 확인');
      workIssues(e.work, stats).forEach(fail);
      resolutionIssues(e.resolution, stats).forEach(fail);
    }
    if (e.kind === 'exam') resolutionIssues(e.resolution, stats).forEach(fail);
    if (
      ['task', 'exam'].includes(e.kind) &&
      (e.scope !== 'course' ||
        !plain(e.grade) ||
        !idValid(e.grade.assessmentId) ||
        !Object.hasOwn(courses[e.courseId]?.assessments ?? {}, e.grade.kind) ||
        Object.keys(e.grade).some((k) => !['assessmentId', 'kind'].includes(k)))
    )
      fail('과목 평가 항목 연결 확인');
    if (e.effects !== undefined) {
      if (
        !plain(e.effects) ||
        Object.keys(e.effects).some((k) => !['onComplete', 'onExpire', 'onTrigger'].includes(k))
      )
        fail('효과 시점 확인');
      else Object.values(e.effects).forEach((list) => effectIssues(list, stats).forEach(fail));
    }
    if (e.outcomes !== undefined) {
      if (e.kind !== 'natural' || !Array.isArray(e.outcomes) || e.outcomes.length > 12)
        fail('자연발생 분기 확인');
      else
        for (const o of e.outcomes) {
          if (
            !plain(o) ||
            Object.keys(o).some((k) => !['when', 'description', 'effects'].includes(k)) ||
            !text(o.description)
          ) {
            fail('분기 설명 확인');
            continue;
          }
          conditionIssues(o.when, { courses, stats, majors }).forEach(fail);
          effectIssues(o.effects, stats).forEach(fail);
        }
    }
    if (e.kind === 'choice') {
      if (
        !Array.isArray(e.options) ||
        !e.options.length ||
        e.options.length > 12 ||
        new Set(e.options.map((o) => o?.id)).size !== e.options.length
      )
        fail('선택지 확인');
      else
        for (const o of e.options) {
          if (
            !plain(o) ||
            !idValid(o.id) ||
            !text(o.label) ||
            !text(o.detail) ||
            !integer(o.cost ?? 0, 0, 1000000) ||
            Object.keys(o).some(
              (k) =>
                !['id', 'label', 'detail', 'cost', 'effect', 'chanceResult', 'when'].includes(k),
            )
          ) {
            fail('선택지 필드 확인');
            continue;
          }
          conditionIssues(o.when, { courses, stats, majors }).forEach(fail);
          const effects = [
            o.effect ?? {},
            o.chanceResult?.success ?? {},
            o.chanceResult?.failure ?? {},
          ];
          if (
            o.chanceResult &&
            (!plain(o.chanceResult) ||
              Object.keys(o.chanceResult).some(
                (k) => !['chance', 'income', 'success', 'failure'].includes(k),
              ) ||
              !number(o.chanceResult.chance, 0, 1) ||
              !integer(o.chanceResult.income ?? 0, 0, 1000000))
          )
            fail('선택 확률·보상 확인');
          for (const values of effects)
            if (
              !plain(values) ||
              Object.entries(values).some(
                ([k, v]) => !Object.hasOwn(stats, k) || !number(v, -100, 100),
              )
            )
              fail('선택 효과 확인');
        }
    }
  }
  return issues;
}

// Compile editable JSON to the existing engine contract. No expressions or code are evaluated.
export function expandScenarios(content) {
  const result = {};
  for (const [id, e] of Object.entries(content.events)) {
    if (e.enabled === false) continue;
    const t = e.trigger;
    let count = 0;
    for (
      let week = t.week;
      week <= (t.untilWeek ?? t.week) && count < t.maxOccurrencesPerTerm;
      week += t.repeatEvery ?? 41
    ) {
      const instance = count++ === 0 ? id : `${id}--w${week + termOffset(t.term)}`;
      const compiled = {
        name: e.name,
        description: e.description,
        kind: e.kind === 'natural' || e.kind === 'exam' ? 'notice' : e.kind,
        week: week + termOffset(t.term),
        day: t.day,
        phase: t.phase,
        chance: t.probability,
        ...(t.when ? { when: structuredClone(t.when) } : {}),
        ...(e.courseId ? { course: e.courseId } : {}),
        scope: e.scope,
        sourceId: id,
        scenarioKind: e.kind,
        effect: effectMap(e.effects?.onTrigger),
      };
      if (e.kind === 'task')
        Object.assign(compiled, {
          target: e.work.targetProgress,
          deadline: e.deadline.week + week - t.week + termOffset(t.term),
          deadlineDay: e.deadline.day,
          work: structuredClone(e.work),
          resolution: structuredClone(e.resolution),
          grade: structuredClone(e.grade),
          reward: effectMap(e.effects?.onComplete),
          penalty: effectMap(e.effects?.onExpire),
          module: { id: 'time_v1', params: {} },
        });
      if (e.kind === 'exam')
        Object.assign(compiled, {
          resolution: structuredClone(e.resolution),
          grade: structuredClone(e.grade),
        });
      if (e.options) compiled.options = structuredClone(e.options);
      if (e.outcomes) compiled.outcomes = structuredClone(e.outcomes);
      result[instance] = compiled;
    }
  }
  return result;
}

export function scenarioScore(state, definition, roll) {
  const p = definition.resolution.params;
  const ability = state.stats[p.ability];
  return Math.round(
    Math.max(
      0,
      Math.min(p.maxScore, p.base + ability * p.abilityWeight + (roll() - 0.5) * 2 * p.randomness),
    ),
  );
}
