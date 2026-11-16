import { useCallback, useEffect, useRef, useState } from 'react';
import { TUTORIAL_LESSONS, tutorialCompletion } from './tutorial.js';
import {
  readTutorialVisits,
  tutorialStorageKey,
  TUTORIAL_EVIDENCE,
  writeTutorialVisits,
} from '../../platform/tutorial-progress.js';

export default function useTutorial(state, owner) {
  const scope = `${owner ?? 'local'}:${state.flags.runRevision ?? 0}`;
  const [progress, setProgress] = useState({ scope: null, key: null, visited: [] });
  const [active, setActive] = useState(null);
  const waiting = useRef(new Map());
  useEffect(() => {
    let disposed = false;
    setActive(null);
    tutorialStorageKey(owner, state.flags.runRevision)
      .then((key) => {
        if (disposed) return;
        const visited = [
          ...new Set([...readTutorialVisits(key), ...(waiting.current.get(scope) ?? [])]),
        ];
        waiting.current.delete(scope);
        writeTutorialVisits(key, visited);
        setProgress({ scope, key, visited });
      })
      .catch(() => {
        if (!disposed) setProgress({ scope, key: null, visited: [] });
      });
    return () => {
      disposed = true;
    };
  }, [scope, owner, state.flags.runRevision]);
  const observe = useCallback(
    (id) => {
      if (!TUTORIAL_EVIDENCE.includes(id)) return;
      setProgress((old) => {
        if (old.scope !== scope) {
          const pending = waiting.current.get(scope) ?? new Set();
          pending.add(id);
          waiting.current.set(scope, pending);
          return old;
        }
        if (old.visited.includes(id)) return old;
        const visited = [...old.visited, id];
        if (old.key) writeTutorialVisits(old.key, visited);
        return { ...old, visited };
      });
    },
    [scope],
  );
  const readResult = useCallback(() => observe('result-read'), [observe]);
  const visited = progress.scope === scope ? progress.visited : [];
  const completed = tutorialCompletion(state, visited);
  return {
    active,
    visited,
    observe,
    readResult,
    visit: (id) => setActive(id),
    completed,
    count: Object.values(completed).filter(Boolean).length,
    total: TUTORIAL_LESSONS.length,
    reset: () => {
      waiting.current.delete(scope);
      setProgress((old) => {
        if (old.scope !== scope) return old;
        if (old.key) writeTutorialVisits(old.key, []);
        return { ...old, visited: [] };
      });
      setActive(null);
    },
  };
}
