import { useEffect, useState } from 'react';
import { isNightAt } from '../systems/clock.js';
export function useDaylight() {
  const [night, setNight] = useState(() => isNightAt());
  useEffect(() => {
    const update = () => setNight(isNightAt());
    const timer = setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return night;
}
