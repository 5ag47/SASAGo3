import { applyChoice, choiceOptions, INTERVIEW_LENGTH } from '../choices.js';
import { requireRule } from '../errors.js';

export const choiceCommands = {
  choose: {
    fields: ['type', 'event', 'option', 'answers'],
    apply(state, command) {
      requireRule(
        state.pending.includes(command.event),
        'EVENT_INVALID',
        '이미 결정했거나 아직 발생하지 않은 이벤트예요.',
      );
      if (command.event === 'interview_day') {
        const answered = state.minigames.interview?.answers.length ?? 0;
        const single = /^answer:[0-2]$/.test(command.option ?? '') && command.answers === undefined;
        requireRule(
          single ||
            (answered === 0 &&
              Array.isArray(command.answers) &&
              command.answers.length === INTERVIEW_LENGTH &&
              command.answers.every((a) => Number.isInteger(a) && a >= 0 && a < 3)),
          'ANSWERS_INVALID',
          '현재 질문의 답변을 선택해 주세요.',
        );
      } else {
        const option = choiceOptions(state, command.event).find((o) => o.id === command.option);
        requireRule(option, 'OPTION_INVALID', '선택지를 다시 골라 주세요.');
        requireRule(
          !option.locked,
          'OPTION_LOCKED',
          option.requirement || '선택 조건을 아직 충족하지 못했습니다.',
        );
        requireRule(
          state.money >= (option.cost ?? 0),
          'MONEY_LOW',
          '용돈이 부족해요. 다른 선택지를 골라 주세요.',
        );
      }
      applyChoice(
        state,
        command.event,
        command.option,
        command.event === 'interview_day' && command.answers === undefined
          ? [Number(command.option.slice(7))]
          : command.answers,
      );

      return state;
    },
  },
};
