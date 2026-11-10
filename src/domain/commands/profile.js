import { CHARACTERS, courses, ELECTIVES, MAJORS, roles } from '../catalog.js';
import { baseState, balancedPlan } from '../state.js';
import { applyEffects, random } from '../random.js';
import { beginWeek } from '../events.js';
import { enrollCourses } from '../course-progress.js';
import { courseSet } from '../enrollment.js';
import { requireRule } from '../errors.js';
export function createGame(profile, seed = 20261013) {
  requireRule(
    typeof profile?.name === 'string' &&
      profile.name.trim().length > 0 &&
      profile.name.trim().length <= 12,
    'PROFILE_NAME',
    '이름은 1~12자로 입력해 주세요.',
  );
  requireRule(
    Object.hasOwn(CHARACTERS, profile.character) &&
      Object.hasOwn(roles, profile.role) &&
      Object.hasOwn(MAJORS, profile.major),
    'PROFILE_OPTION',
    '캐릭터·특성·전공을 다시 선택해 주세요.',
  );
  const state = baseState(seed);
  const electives = profile.electives === undefined ? [] : profile.electives;
  requireRule(
    Array.isArray(electives) &&
      electives.length <= ELECTIVES.length &&
      new Set(electives).size === electives.length &&
      electives.every((id) => ELECTIVES.includes(id)),
    'ELECTIVES_INVALID',
    '선택과목을 다시 확인해 주세요.',
  );
  Object.assign(state, {
    created: true,
    name: profile.name.trim(),
    character: profile.character,
    role: profile.role,
    major: profile.major,
    electives: [...electives],
    courses: courseSet(profile.major, electives),
  });
  applyEffects(state, roles[profile.role].stats, 1, { growth: false });
  state.campaign.playerId = 'SASA-' + (seed >>> 0).toString(16).toUpperCase();
  state.campaign.priorGpa = Math.round((3.0 + random(state) * 1.3) * 100) / 100;
  enrollCourses(state);
  beginWeek(state);
  state.plan = balancedPlan(state);
  return state;
}
export const profileCommands = {
  create: {
    fields: ['type', 'profile'],
    profileShape: { required: ['name', 'character', 'role', 'major'], optional: ['electives'] },
    startsGame: true,
    apply(state, command) {
      requireRule(!state.created, 'ALREADY_CREATED', '이미 시작한 게임이에요.');
      const next = createGame(command.profile, state.seed);
      next.flags.runRevision = state.revision + 1;
      return next;
    },
  },
};
