import { useEffect, useRef, useState } from 'react';
import { createTaskInputBuffer } from '../../../platform/task-input-buffer.js';
export default function useTaskInput(task, busy, onAction, draftKey) {
  const latest = useRef({ busy, onAction });
  latest.current = { busy, onAction };
  const [view, setView] = useState(null);
  const [buffer] = useState(() =>
    createTaskInputBuffer({
      task,
      send: (action) => latest.current.onAction(action),
      canSend: () => !latest.current.busy,
      onChange: setView,
      storage: typeof sessionStorage === 'undefined' ? null : sessionStorage,
      storageKey: draftKey,
    }),
  );
  useEffect(() => {
    buffer.attach();
    return () => buffer.detach();
  }, [buffer]);
  useEffect(() => {
    buffer.reconcile(task);
    if (!busy) buffer.resume();
  }, [task, busy, buffer]);
  return {
    ...(view ?? buffer.snapshot()),
    input: buffer.input,
    retry: buffer.retry,
    acceptServer: buffer.acceptServer,
  };
}
