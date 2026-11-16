import order from './order-v1.js';
import pattern from './pattern-v1.js';
import { clamp } from '../random.js';

const effectKeys = [
  'hp',
  'focus',
  'stress',
  'math',
  'science',
  'writing',
  'speech',
  'reputation',
  'charm',
];
export const SESSION_DEFAULTS = Object.freeze({
  cost: { hp: -0.5, stress: 1 },
  success: {},
  mistake: { stress: 0.5 },
  failure: { stress: 2 },
  support: 'none',
  overloadAfter: 2,
  overloadHealth: 0.75,
  overloadStress: 1.5,
  weeklyLimit: null,
  variance: 0,
  earlyWeeks: 0,
  earlyQuality: 90,
  earlyEffect: {},
});
export function sessionSettings(params = {}) {
  return { ...SESSION_DEFAULTS, ...params };
}
function validate(params, rules = {}) {
  if (!params || typeof params !== 'object' || Array.isArray(params))
    return ['params 객체가 필요합니다.'];
  const issues = [];
  if (params.support !== undefined && !['none', 'essay'].includes(params.support))
    issues.push('support: none 또는 essay가 필요합니다.');
  if (
    params.weeklyLimit !== undefined &&
    params.weeklyLimit !== null &&
    (!Number.isInteger(params.weeklyLimit) || params.weeklyLimit < 1 || params.weeklyLimit > 1000)
  )
    issues.push('weeklyLimit: 1~1000 또는 null이 필요합니다.');
  for (const key of Object.keys(params))
    if (!Object.hasOwn(SESSION_DEFAULTS, key) && !Object.hasOwn(rules, key))
      issues.push(`알 수 없는 설정: ${key}`);
  // Game-specific settings (labels, layouts) are checked by the game that reads them.
  for (const [key, rule] of Object.entries(rules))
    if (params[key] !== undefined) {
      const message = rule(params[key]);
      if (message) issues.push(`${key}: ${message}`);
    }
  for (const key of ['cost', 'success', 'mistake', 'failure', 'earlyEffect'])
    if (params[key] !== undefined) {
      const value = params[key];
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.entries(value).some(
          ([stat, amount]) =>
            !effectKeys.includes(stat) || !Number.isFinite(amount) || Math.abs(amount) > 30,
        )
      )
        issues.push(`${key}: 능력치와 -30~30 범위의 수치가 필요합니다.`);
    }
  for (const [key, min, max] of [
    ['overloadAfter', 0, 21],
    ['overloadHealth', 0, 5],
    ['overloadStress', 0, 10],
    ['variance', 0, 10],
    ['earlyWeeks', 0, 40],
    ['earlyQuality', 0, 100],
  ])
    if (
      params[key] !== undefined &&
      (!Number.isFinite(params[key]) || params[key] < min || params[key] > max)
    )
      issues.push(`${key}: ${min}~${max} 범위가 필요합니다.`);
  return issues;
}
export function makeSessionModule(base, id, rules = {}) {
  return {
    ...base,
    id,
    session: true,
    validate: (params) => validate(params, rules),
    game: {
      ...base.game,
      preview(data, action) {
        if (base.game.view === 'pattern' && action.type === 'check') return { data, barrier: true };
        if (!['pick', 'toggle', 'ready'].includes(action.type)) return null;
        const next = base.game.act({}, data, action),
          terminal = next.passed;
        const view = base.game.public(next);
        if (terminal) {
          view.passed = false;
          view.quality = null;
          view.phase = 'play';
        }
        return { data: view, barrier: terminal };
      },
    },
    attemptEffects({ task, params, supportCost }) {
      const config = sessionSettings(params),
        count = task.attempts?.weekCount ?? 0;
      const extra = Math.max(0, count - config.overloadAfter);
      const effects = {
        ...config.cost,
        hp: Math.max(-100, (config.cost.hp ?? 0) - extra * config.overloadHealth),
        stress: Math.min(100, (config.cost.stress ?? 0) + extra * config.overloadStress),
      };
      return supportCost?.(config.support, effects) ?? effects;
    },
    actionEffects({ params }, before, after) {
      return after.mistakes > before.mistakes ? sessionSettings(params).mistake : {};
    },
    failAttempt({ params }) {
      return { effects: sessionSettings(params).failure };
    },
    finishAttempt({ task, params, stats, roll, week, support }) {
      const config = sessionSettings(params);
      const randomBonus = config.variance ? Math.round((roll() * 2 - 1) * config.variance) : 0;
      const condition = (stats.hp < 30 ? -10 : 0) + (stats.stress >= 70 ? -10 : 0);
      const quality = Math.round(
        clamp(
          (support?.(config.support, clamp((task.moduleData?.quality ?? 100) + randomBonus)) ??
            task.moduleData?.quality ??
            100) + condition,
        ),
      );
      const early =
        config.earlyWeeks > 0 &&
        week < task.start + config.earlyWeeks &&
        quality >= config.earlyQuality;
      const effects = { ...config.success };
      if (early)
        for (const [stat, amount] of Object.entries(config.earlyEffect))
          effects[stat] = (effects[stat] ?? 0) + amount;
      return { quality, effects, randomBonus, early };
    },
  };
}
export const orderSession = makeSessionModule(order, 'order_v2');
export const patternSession = makeSessionModule(pattern, 'pattern_v2');
