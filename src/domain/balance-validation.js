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
    allowance: [0, 100000, true],
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
    fatigueMultiplier: [0.01, 1],
    repetitionStart: [1, 21, true],
    repetitionLoss: [0, 1],
    repetitionFloor: [0.01, 1],
  },
  fatigue: {
    lowHealth: [0, 100],
    highStress: [0, 100],
    minimumHealth: [0, 100],
    peakStress: [0, 100],
  },
};
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
    if (!Object.hasOwn(fields, key) && key !== 'admissions') issues.push(`${key}: unknown section`);
  for (const [key, schema] of Object.entries(fields)) shape(value[key], key, schema);
  if (
    value.presets?.recoveryWorkSlots > value.presets?.workSlots ||
    value.presets?.balancedTaskSlots > value.presets?.workSlots
  )
    issues.push('presets: sub-budgets exceed workSlots');
  if (Math.abs(value.projects?.qualityBase + value.projects?.qualityWeight - 1) > 0.00001)
    issues.push('projects: quality weights must sum to 1');
  const config = value.admissions;
  if (!record(config)) return [...issues, 'admissions: object required'];
  for (const key of Object.keys(config))
    if (
      ![
        'essayThreshold',
        'csatThreshold',
        'comprehensiveDefault',
        'thresholds',
        'targetBonuses',
      ].includes(key)
    )
      issues.push(`admissions.${key}: unknown field`);
  for (const key of ['essayThreshold', 'csatThreshold', 'comprehensiveDefault'])
    number(config[key], `admissions.${key}`, [0, 100]);
  if (!record(config.thresholds) || !Object.keys(config.thresholds).length)
    issues.push('admissions.thresholds: nonempty object required');
  const profiles = Object.keys(config.thresholds ?? {});
  for (const [key, threshold] of Object.entries(config.thresholds ?? {})) {
    if (!/^[a-z][a-z0-9_]+$/.test(key)) issues.push(`admissions.thresholds.${key}: invalid ID`);
    number(threshold, `admissions.thresholds.${key}`, [0, 100]);
  }
  const targets = config.targetBonuses;
  if (
    !record(targets) ||
    Object.keys(targets).some((key) => !['dream', 'balanced', 'safe'].includes(key))
  )
    issues.push('admissions.targetBonuses: invalid targets');
  for (const target of ['dream', 'balanced', 'safe'])
    shape(
      targets?.[target],
      `admissions.targetBonuses.${target}`,
      Object.fromEntries(profiles.map((id) => [id, [-20, 20]])),
    );
  return issues;
}
