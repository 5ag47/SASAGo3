import { useEffect, useState } from 'react';
export function worldClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour').value);
  const minute = parts.find((p) => p.type === 'minute').value;
  return { night: hour < 7 || hour >= 19, time: `${String(hour).padStart(2, '0')}:${minute}` };
}
export default function useWorldClock() {
  const [clock, setClock] = useState(() => worldClock());
  useEffect(() => {
    const update = () => setClock(worldClock());
    const timer = setInterval(update, 30000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return clock;
}
