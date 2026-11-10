import { ADMISSION_DIRECTIONS } from '../school-record.js';
import { applyChoice } from '../choices.js';
import { applyEffects } from '../random.js';
import { requireRule } from '../errors.js';
import { refreshDocuments } from '../admission-documents.js';
export const admissionsCommands = {
  admission_direction: {
    fields: ['type', 'direction'],
    apply(state, command) {
      requireRule(
        Object.hasOwn(ADMISSION_DIRECTIONS, command.direction),
        'DIRECTION_INVALID',
        '지원 방향을 다시 선택해 주세요.',
      );
      requireRule(
        state.week >= 25 && state.week <= 28 && !state.documents,
        'APPLICATIONS_CLOSED',
        '원서 시즌의 서류 제출 전까지만 지원 방향을 바꿀 수 있습니다.',
      );
      if (state.pending.includes('applications'))
        applyChoice(state, 'applications', command.direction);
      else if (
        state.flags.target !== command.direction ||
        !ADMISSION_DIRECTIONS[state.choices.applications]
      ) {
        const changed = state.flags.target !== command.direction;
        state.flags.target = command.direction;
        state.choices.applications = command.direction;
        if (changed) applyEffects(state, { stress: 2 });
      }
      refreshDocuments(state);
      return state;
    },
  },
};
