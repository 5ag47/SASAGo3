import { bestOffer, endingAvailable } from '../endings.js';
import { items, LAST_WEEK } from '../catalog.js';
import { applyEffects } from '../random.js';
import { resolveWeek, skipRunTask } from '../week.js';
import { progressChapter } from '../story.js';
import { requireRule } from '../errors.js';

export const progressionCommands = {
  advance: {
    fields: ['type', 'skipTask'],
    apply(state, command) {
      requireRule(
        state.week <= LAST_WEEK,
        'YEAR_FINISHED',
        '한 해가 끝났어요. 진학실에서 다음 길을 선택하세요.',
      );
      requireRule(
        command.skipTask === undefined || typeof command.skipTask === 'boolean',
        'COMMAND_INVALID',
        '진행 요청을 확인해 주세요.',
      );
      if (state.weekRun?.waiting?.kind === 'task') {
        requireRule(
          command.skipTask === true,
          'TASK_IN_PROGRESS',
          '현재 작업을 끝내거나 작업을 중단하고 계속해 주세요.',
        );
        skipRunTask(state);
      }
      state = resolveWeek(state);

      return state;
    },
  },
  story: {
    fields: ['type', 'chapter', 'action'],
    allowEnded: true,
    apply(state, command) {
      requireRule(
        typeof command.chapter === 'string' &&
          progressChapter(state, command.chapter, command.action),
        'STORY_INVALID',
        '지금 읽을 수 없는 장면입니다.',
      );

      return state;
    },
  },
  buy: {
    fields: ['type', 'item'],
    apply(state, command) {
      requireRule(Object.hasOwn(items, command.item), 'ITEM_INVALID', '상품을 다시 선택해 주세요.');
      const item = items[command.item];
      requireRule(state.money >= item.price, 'MONEY_LOW', '용돈이 부족해요.');
      state.money -= item.price;
      applyEffects(state, item.effect);

      return state;
    },
  },
  ending: {
    fields: ['type', 'ending'],
    apply(state, command) {
      requireRule(
        endingAvailable(state, command.ending),
        'ENDING_LOCKED',
        '아직 선택할 수 없는 결말이에요.',
      );
      state.ending = { id: command.ending, week: state.week };
      if (command.ending === 'university') state.ending.school = bestOffer(state)?.name ?? '';

      return state;
    },
  },
};
