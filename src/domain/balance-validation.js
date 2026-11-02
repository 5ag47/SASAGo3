// Content validation is shared by the CLI and tests; no runtime or UI dependencies.
const fields = {
  growth: {
    academicRate: [0.01, 2],
    academicPower: [0.1, 5],
    academicFloor: [0.01, 1],
    socialRate: [0.01, 2],
    socialScale: [100, 1000],
    socialFloor: [0.01, 1],
    courseRate: [0.01, 2],
    coursePower: [0.1, 5],
    courseFloor: [0.01, 1],
  },
  presets: {
    workSlots: [1, 21, true],
    recoveryWorkSlots: [0, 21, true],
    balancedTaskSlots: [0, 21, true],
    longProjectSlots: [1, 21, true],
  },
  exams: {
    base: [0, 100],
    abilityWeight: [0, 2],
    hardChance: [0, 0.5],
    hardPenalty: [-100, 0],
    easyBonus: [0, 100],
    normalSpread: [0, 100],
    introRelief: [0, 100],
    reliefEnds: [1, 40, true],
  },
  projects: { qualityBase: [0, 1], qualityWeight: [0, 1] },
  relationships: { visitGain: [0, 100], softScale: [100, 1000] },
  weekly: {
    livingCost: [0, 100000, true],
    healthCost: [0, 100],
    focusCost: [0, 100],
    baseStress: [0, 100],
    workStress: [0, 10],
  },
  learning: {
    base: [0.01, 2],
    focusScale: [1, 10000],
    stressThreshold: [0, 100],
    lowHealth: [0, 100],
    conditionMultiplier: [0.01, 1],
    strainMultiplier: [0.01, 1],
    fatigueMultiplier: [0.01, 1],
    burnoutMultiplier: [0.01, 1],
    repetitionStart: [1, 21, true],
    repetitionLoss: [0, 1],
    repetitionFloor: [0.01, 1],
  },
  fatigue: {
    strainStress: [0, 100],
    strainHealth: [0, 100],
    tiredStress: [0, 100],
    tiredHealth: [0, 100],
    burnoutStress: [0, 100],
    burnoutHealth: [0, 100],
    minimumHealth: [0, 100],
    peakStress: [0, 100],
  },
  money: { monthlyAllowance: [0, 1000000, true] },
  recovery: { freeSlots: [0, 21, true], loss: [0, 1], floor: [0, 1] },
  focus: { drift: [0, 1], healthWeight: [0, 1], stagePenalty: [0, 50] },
};
const SEASON_KEYS = ['from', 'to', 'pressure', 'label', 'vacation'];
const ADMISSION_KEYS = [
  'essayThreshold',
  'csatThreshold',
  'comprehensiveDefault',
  'thresholds',
  'csatGrades',
  'csatAbilityWeight',
  'csatPrepGain',
  'csatPrepCap',
  'csatMinimum',
  'regularGrade',
];
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
export function balanceIssues(value) {
  const issues = [];
  function number(value, path, [min, max, integer]) {
    if (
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    )
      issues.push(`${path}: ${min}~${max}${integer ? ' integer' : ''}`);
  }
  function shape(value, path, schema) {
    if (!record(value)) {
      issues.push(`${path}: object required`);
      return;
    }
    for (const key of Object.keys(value))
      if (!Object.hasOwn(schema, key)) issues.push(`${path}.${key}: unknown field`);
    for (const [key, range] of Object.entries(schema)) number(value[key], `${path}.${key}`, range);
  }
  if (!record(value)) return ['balance: object required'];
  for (const key of Object.keys(value))
    if (!Object.hasOwn(fields, key) && !['admissions', 'seasons'].includes(key))
      issues.push(`${key}: unknown section`);
  for (const [key, schema] of Object.entries(fields)) shape(value[key], key, schema);
  if (
    value.presets?.recoveryWorkSlots > value.presets?.workSlots ||
    value.presets?.balancedTaskSlots > value.presets?.workSlots
  )
    issues.push('presets: sub-budgets exceed workSlots');
  if (
    value.fatigue?.strainStress > value.fatigue?.tiredStress ||
    value.fatigue?.tiredStress > value.fatigue?.burnoutStress ||
    value.fatigue?.strainHealth < value.fatigue?.tiredHealth ||
    value.fatigue?.tiredHealth < value.fatigue?.burnoutHealth
  )
    issues.push('fatigue: stages must get stricter from strain to burnout');
  issues.push(...seasonIssues(value.seasons, number));
  if (Math.abs(value.projects?.qualityBase + value.projects?.qualityWeight - 1) > 0.00001)
    issues.push('projects: quality weights must sum to 1');
  const config = value.admissions;
  if (!record(config)) return [...issues, 'admissions: object required'];
  for (const key of Object.keys(config))
    if (!ADMISSION_KEYS.includes(key)) issues.push(`admissions.${key}: unknown field`);
  for (const key of ['essayThreshold', 'csatThreshold', 'comprehensiveDefault', 'csatPrepCap'])
    number(config[key], `admissions.${key}`, [0, 100]);
  number(config.csatAbilityWeight, 'admissions.csatAbilityWeight', [0, 2]);
  number(config.csatPrepGain, 'admissions.csatPrepGain', [0, 10]);
  number(config.regularGrade, 'admissions.regularGrade', [1, 9, true]);
  if (
    !Array.isArray(config.csatGrades) ||
    config.csatGrades.length !== 8 ||
    config.csatGrades.some(
      (cut, i) => !Number.isFinite(cut) || (i && cut >= config.csatGrades[i - 1]),
    )
  )
    issues.push('admissions.csatGrades: 8 strictly decreasing cut scores for grades 1~8');
  if (!record(config.csatMinimum)) issues.push('admissions.csatMinimum: object required');
  if (!record(config.thresholds) || !Object.keys(config.thresholds).length)
    issues.push('admissions.thresholds: nonempty object required');
  const profiles = Object.keys(config.thresholds ?? {});
  for (const [key, threshold] of Object.entries(config.thresholds ?? {})) {
    if (!/^[a-z][a-z0-9_]+$/.test(key)) issues.push(`admissions.thresholds.${key}: invalid ID`);
    number(threshold, `admissions.thresholds.${key}`, [0, 100]);
  }
  for (const [key, grade] of Object.entries(record(config.csatMinimum) ? config.csatMinimum : {})) {
    if (!profiles.includes(key)) issues.push(`admissions.csatMinimum.${key}: unknown profile`);
    number(grade, `admissions.csatMinimum.${key}`, [1, 9, true]);
  }
  return issues;
}
// Seasons are keyed by stable IDs and must cover every playable week exactly once.
function seasonIssues(seasons, number) {
  if (!record(seasons) || !Object.keys(seasons).length)
    return ['seasons: nonempty object required'];
  const issues = [],
    covered = new Array(41).fill(0);
  for (const [id, season] of Object.entries(seasons)) {
    const path = `seasons.${id}`;
    if (!/^[a-z][a-z0-9_]+$/.test(id)) issues.push(`${path}: invalid ID`);
    if (!record(season)) {
      issues.push(`${path}: object required`);
      continue;
    }
    for (const key of Object.keys(season))
      if (!SEASON_KEYS.includes(key)) issues.push(`${path}.${key}: unknown field`);
    number(season.from, `${path}.from`, [0, 40, true]);
    number(season.to, `${path}.to`, [0, 40, true]);
    number(season.pressure, `${path}.pressure`, [0.5, 2.5]);
    if (typeof season.label !== 'string' || !season.label || season.label.length > 20)
      issues.push(`${path}.label: 1~20 characters`);
    if (season.vacation !== undefined && typeof season.vacation !== 'boolean')
      issues.push(`${path}.vacation: boolean`);
    if (Number.isInteger(season.from) && Number.isInteger(season.to) && season.from <= season.to)
      for (let week = season.from; week <= Math.min(40, season.to); week++) covered[week]++;
    else issues.push(`${path}: from must not exceed to`);
  }
  if (covered.some((count) => count !== 1))
    issues.push('seasons: weeks 0~40 must each belong to one season');
  return issues;
}
