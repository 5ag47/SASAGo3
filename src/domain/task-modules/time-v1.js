const clamp = (value) => Math.max(0, Math.min(100, value));
export default {
  id: 'time_v1',
  name: '시간 투자',
  unit: '칸',
  estimated: false,
  validate(params) {
    return params &&
      typeof params === 'object' &&
      !Array.isArray(params) &&
      !Object.keys(params).length
      ? []
      : ['설정은 빈 객체여야 합니다.'];
  },
  work({ amount }) {
    return { progress: amount };
  },
  isComplete({ task }) {
    return task.progress >= task.target;
  },
  estimate({ task }) {
    return Math.ceil(task.target - task.progress);
  },
  complete({ task, abilityAfter, roll }) {
    const difficulty = task.course ? Math.round((roll() - 0.5) * 8) : 0;
    return {
      effects: task.reward ?? {},
      score: task.course
        ? Math.round(clamp(65 + abilityAfter(task.reward) * 0.35 + difficulty))
        : null,
      difficulty,
    };
  },
  expire({ task }) {
    return {
      effects: task.penalty ?? {},
      score: task.course ? Math.round((task.progress / task.target) * 55) : null,
    };
  },
};
