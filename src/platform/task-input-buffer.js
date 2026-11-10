import { taskModule, moduleSignature } from '../domain/task-modules/registry.js';
// Responsive input is a reversible draft. Only server replies confirm a result.
export function createTaskInputBuffer({
  task,
  send,
  onChange = () => {},
  canSend = () => true,
  storage,
  storageKey,
  delay = 220,
}) {
  const module = taskModule(task),
    attempt = task.attempts?.total ?? 1;
  let confirmed = structuredClone(task.moduleData),
    data = confirmed;
  let sequence = task.attempts?.sequence ?? 0,
    queue = [],
    inFlight = false,
    barrier = false,
    error = '',
    timer,
    attached = false,
    finished = false;
  const snapshot = () => ({
    data,
    saving: inFlight || queue.length > 0,
    blocked: barrier || Boolean(error),
    error,
    queued: queue.length,
  });
  const emit = () => {
    if (attached) onChange(snapshot());
  };
  const persist = () => {
    if (!storage || !storageKey) return;
    try {
      if (!queue.length) storage.removeItem(storageKey);
      else storage.setItem(storageKey, JSON.stringify({ attempt, from: sequence, actions: queue }));
    } catch {
      /* Network checkpoints still work when browser draft storage is unavailable. */
    }
  };
  function replay() {
    data = structuredClone(confirmed);
    barrier = false;
    for (const action of queue) {
      const next = module.game.preview?.(data, action);
      if (next) {
        data = next.data;
        barrier ||= Boolean(next.barrier);
      } else barrier = true;
    }
  }
  function reconcile(nextTask) {
    if (inFlight || !nextTask) return;
    if (
      nextTask.status !== 'active' ||
      (nextTask.attempts?.total ?? attempt) !== attempt ||
      (nextTask.attempts?.successful ?? 0) > (task.attempts?.successful ?? 0)
    ) {
      finished = true;
      queue = [];
      persist();
      emit();
      return;
    }
    const nextSequence = nextTask.attempts?.sequence ?? 0;
    if (nextSequence < sequence) return;
    const taken = nextSequence - sequence;
    if (taken > queue.length) {
      if (queue.length) {
        error = '다른 창에서 작업이 바뀌었습니다. 최신 기록을 확인해 주세요.';
        emit();
        return;
      }
    } else if (taken && queue.length) {
      const receipts = nextTask.attempts.receipts,
        offset = nextSequence - receipts.length;
      if (
        !queue
          .slice(0, taken)
          .every((action, index) => moduleSignature(action) === receipts[sequence + index - offset])
      ) {
        error = '저장된 입력과 다릅니다. 최신 기록을 확인해 주세요.';
        emit();
        return;
      }
      queue = queue.slice(taken);
    }
    confirmed = structuredClone(nextTask.moduleData);
    sequence = nextSequence;
    replay();
    persist();
    emit();
  }
  async function flush() {
    clearTimeout(timer);
    if (inFlight || !queue.length || error || finished || !canSend()) return;
    inFlight = true;
    emit();
    const sent = queue.slice(0, 32),
      from = sequence;
    let next;
    try {
      next = await send({ type: 'batch', attempt, from, actions: sent });
    } catch {
      next = false;
    }
    inFlight = false;
    if (!next?.tasks?.[task.id]) {
      error = '입력은 임시 보관했습니다. 연결과 최신 저장을 확인한 뒤 다시 시도해 주세요.';
      persist();
      emit();
      return;
    }
    reconcile(next.tasks[task.id]);
    if (queue.length && !error && !finished) schedule();
  }
  function schedule(immediate = false) {
    clearTimeout(timer);
    if (immediate) void flush();
    else timer = setTimeout(() => void flush(), delay);
  }
  function input(action) {
    if (barrier || error || finished || queue.length >= 32) return false;
    const next = module.game.preview?.(data, action);
    queue.push(structuredClone(action));
    if (next) {
      data = next.data;
      barrier = Boolean(next.barrier);
    } else barrier = true;
    if (queue.length >= 32) barrier = true;
    persist();
    emit();
    schedule(barrier);
    return true;
  }
  try {
    const draft = storageKey && storage?.getItem(storageKey);
    if (draft) {
      const saved = JSON.parse(draft);
      if (
        saved.attempt === attempt &&
        Number.isInteger(saved.from) &&
        Array.isArray(saved.actions) &&
        saved.actions.length <= 32 &&
        saved.from <= sequence
      ) {
        queue = saved.actions;
        const current = sequence;
        sequence = saved.from;
        reconcile({ ...task, attempts: { ...task.attempts, sequence: current } });
      } else storage.removeItem(storageKey);
    }
  } catch {
    queue = [];
  }
  return {
    snapshot,
    input,
    flush,
    reconcile,
    acceptServer(nextTask) {
      queue = [];
      error = '';
      finished = false;
      confirmed = structuredClone(nextTask.moduleData);
      sequence = nextTask.attempts?.sequence ?? 0;
      replay();
      persist();
      emit();
    },
    attach() {
      attached = true;
      emit();
      if (queue.length) schedule();
    },
    detach() {
      attached = false;
      clearTimeout(timer);
      void flush();
    },
    resume() {
      if (queue.length && !error) schedule();
    },
    retry() {
      error = '';
      emit();
      schedule(true);
    },
  };
}
