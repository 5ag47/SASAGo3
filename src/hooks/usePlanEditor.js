import { useState } from 'react';
import { ACTIVITIES, DAYS } from '../data/activities.js';

export function usePlanEditor(game, setGame, notify) {
  const [selectedDay, setSelectedDay] = useState(3);
  const [draft, setDraft] = useState(game.plan[3]);
  const dirty = draft !== game.plan[selectedDay];

  function selectDay(index) {
    if (dirty) {
      notify('변경한 활동을 먼저 신청하거나 취소해주세요.');
      return;
    }
    setSelectedDay(index);
    setDraft(game.plan[index]);
  }

  function applyPlan() {
    setGame(old => ({ ...old, plan: old.plan.map((id, index) => (index === selectedDay ? draft : id)) }));
    notify(`${DAYS[selectedDay]}요일 ${ACTIVITIES[draft].label} 일정을 신청했어요.`);
  }

  function resetDraft() {
    setDraft(game.plan[selectedDay]);
  }

  return { selectedDay, draft, setDraft, dirty, selectDay, applyPlan, resetDraft };
}
