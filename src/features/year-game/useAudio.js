import { useEffect, useRef, useState } from 'react';
// Short interaction sounds only. The 1124 revision removes all background music.
export default function useAudio() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('sasago3-sfx-volume');
      return saved === null ? 25 : Math.min(100, Math.max(0, Number(saved) || 0));
    } catch {
      return 25;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('sasago3-sfx-volume', String(volume));
    } catch {
      /* optional preference */
    }
  }, [volume]);
  const context = useRef(null);
  useEffect(
    () => () => {
      context.current?.close();
    },
    [],
  );
  async function toggle() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    if (!context.current) context.current = new Audio();
    if (!playing) await context.current.resume();
    setPlaying(!playing);
  }
  function cue() {
    const ctx = context.current;
    if (!playing || !ctx || ctx.state !== 'running') return;
    const note = ctx.createOscillator(),
      gain = ctx.createGain();
    note.frequency.setValueAtTime(660, ctx.currentTime);
    note.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime((volume / 100) * 0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    note.connect(gain);
    gain.connect(ctx.destination);
    note.start();
    note.stop(ctx.currentTime + 0.15);
  }
  return { playing, volume, setVolume, toggle, cue };
}
