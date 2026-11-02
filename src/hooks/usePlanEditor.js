import { useEffect, useState } from 'react';
import { DAYS } from '../data/activities.js';
import { SLEEP_OPTIONS } from '../data/sleep.js';
export function usePlanEditor(game, setGame, notify) {
  const [selectedDay, setSelectedDay] = useState(3);
  const [draft, setDraft] = useState(game.plan[3]);
  const [sleepDraft, setSleepDraft] = useState(game.sleepPlan[3]);
  useEffect(() => {
    setDraft(game.plan[selectedDay]);
    setSleepDraft(game.sleepPlan[selectedDay]);
  }, [game.plan, game.sleepPlan, selectedDay]);
  const dirty = draft !== game.plan[selectedDay] || sleepDraft !== game.sleepPlan[selectedDay];
  function selectDay(index) {
    if (dirty) {
      notify('변경한 일정을 먼저 신청하거나 취소해주세요.');
      return;
    }
    setSelectedDay(index);
    setDraft(game.plan[index]);
    setSleepDraft(game.sleepPlan[index]);
  }
  function applyPlan() {
    if (game.ended || !SLEEP_OPTIONS.includes(sleepDraft)) return;
    setGame(old => old.ended ? old : ({
      ...old,
      plan: old.plan.map((id, index) => index === selectedDay ? draft : id),
      sleepPlan: old.sleepPlan.map((hours, index) => index === selectedDay ? sleepDraft : hours)
    }));
    notify(`${DAYS[selectedDay]}요일 일정을 신청했어요.`);
  }
  function resetDraft() {
    setDraft(game.plan[selectedDay]);
    setSleepDraft(game.sleepPlan[selectedDay]);
  }
  return { selectedDay, draft, setDraft, sleepDraft, setSleepDraft, dirty, selectDay, applyPlan, resetDraft };
}
