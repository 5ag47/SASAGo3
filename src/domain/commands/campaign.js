import { requireRule } from '../errors.js';
import { activityLock } from '../senior-year.js';
import { activities, courses } from '../catalog.js';
import { lockedSlots } from '../schedule.js';
export const campaignCommands = {
  night_plan: {
    fields: ['type', 'day', 'activity', 'target'],
    apply(state, c) {
      requireRule(
        state.week <= 40 && Number.isInteger(c.day) && c.day >= 0 && c.day < 7,
        'NIGHT_INVALID',
        '요일을 확인해 주세요.',
      );
      requireRule(
        !(state.week === 12 && state.courses.includes('general_biology') && c.day >= 4),
        'NIGHT_LOCKED',
        '자연 탐사 일정입니다.',
      );
      requireRule(
        !state.weekRun || c.day > state.weekRun.closedDay,
        'NIGHT_LOCKED',
        '이미 진행한 연장 자습입니다.',
      );
      requireRule(
        c.activity === 'sleep' || (c.activity === 'study' && state.courses.includes(c.target)),
        'NIGHT_INVALID',
        '연장 자습은 과목 공부 또는 잠을 선택하세요.',
      );
      state.campaign.nights[c.day] = {
        activity: c.activity,
        target: c.activity === 'study' ? c.target : null,
      };
      return state;
    },
  },
  save_preset: {
    fields: ['type', 'slot', 'name'],
    apply(state, c) {
      requireRule(
        [0, 1, 2].includes(c.slot) &&
          typeof c.name === 'string' &&
          c.name.trim().length > 0 &&
          c.name.trim().length <= 16,
        'PRESET_INVALID',
        '프리셋 이름은 1~16자입니다.',
      );
      state.campaign.presets[c.slot] = {
        name: c.name.trim(),
        plan: structuredClone(state.plan),
        nights: structuredClone(state.campaign.nights),
      };
      return state;
    },
  },
  load_preset: {
    fields: ['type', 'slot'],
    apply(state, c) {
      requireRule(
        state.week <= 40 && [0, 1, 2].includes(c.slot) && state.campaign.presets[c.slot],
        'PRESET_INVALID',
        '저장된 프리셋을 골라 주세요.',
      );
      const p = state.campaign.presets[c.slot],
        locked = lockedSlots(state);
      state.plan = state.plan.map((old, i) => {
        if (locked[i]) return old;
        let s = p.plan[i];
        if (!Object.hasOwn(activities, s.activity) || activityLock(state, s.activity))
          s = { activity: 'sleep', target: null };
        if (s.activity === 'study' && !state.courses.includes(s.target))
          s = { activity: 'study', target: state.courses[0] };
        if (s.activity === 'task' && state.tasks[s.target]?.status !== 'active')
          s = { activity: 'sleep', target: null };
        if (i % 3 === 0 && !['study', 'skip'].includes(s.activity))
          s = { activity: 'skip', target: null };
        if (state.weekRun) state.weekRun.plan[i] = { ...s };
        return { ...s };
      });
      state.campaign.nights = state.campaign.nights.map((old, day) => {
        if (
          (state.weekRun && day <= state.weekRun.closedDay) ||
          (state.week === 12 && state.courses.includes('general_biology') && day >= 4)
        )
          return old;
        const s = p.nights[day];
        return s.activity === 'study' && state.courses.includes(s.target)
          ? { ...s }
          : { activity: 'sleep', target: null };
      });
      return state;
    },
  },
  rename: {
    fields: ['type', 'name'],
    allowEnded: true,
    apply(state, c) {
      requireRule(
        typeof c.name === 'string' && c.name.trim().length > 0 && c.name.trim().length <= 12,
        'PROFILE_NAME',
        '닉네임은 1~12자입니다.',
      );
      state.name = c.name.trim();
      return state;
    },
  },
};
