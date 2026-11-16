import { useEffect, useRef, useState } from 'react';
export default function useAudio(christmas = false) {
  const [volume, setVolume] = useState(() => {
    try {
      const value = Number(localStorage.getItem('sasago-volume') ?? 25);
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 25;
    } catch {
      return 25;
    }
  });
  const [playing, setPlaying] = useState(false);
  const context = useRef(null);
  const gain = useRef(null);
  const timer = useRef(null);
  const seasonal = useRef(christmas);
  useEffect(() => {
    seasonal.current = christmas;
  }, [christmas]);
  useEffect(() => {
    if (gain.current) gain.current.gain.value = (volume / 100) * 0.12;
    try {
      localStorage.setItem('sasago-volume', String(volume));
    } catch {
      /* Audio remains usable without storage. */
    }
  }, [volume]);
  useEffect(
    () => () => {
      clearInterval(timer.current);
      context.current?.close();
    },
    [],
  );
  async function toggle() {
    if (playing) {
      clearInterval(timer.current);
      await context.current?.suspend();
      setPlaying(false);
      return;
    }
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context.current) {
      context.current = new AudioContext();
      gain.current = context.current.createGain();
      gain.current.gain.value = (volume / 100) * 0.12;
      gain.current.connect(context.current.destination);
    }
    await context.current.resume();
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392];
    let i = 0;
    const play = () => {
      const ctx = context.current;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = 'sine';
      const carol = [
        329.63, 329.63, 329.63, 329.63, 329.63, 329.63, 329.63, 392, 261.63, 293.66, 329.63, 349.23,
        349.23, 349.23, 349.23, 349.23, 329.63, 329.63, 329.63, 392, 392, 349.23, 293.66, 261.63,
      ];
      const melody = seasonal.current ? carol : notes;
      oscillator.frequency.value = melody[i++ % melody.length];
      envelope.gain.setValueAtTime(0, ctx.currentTime);
      envelope.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
      envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      oscillator.connect(envelope);
      envelope.connect(gain.current);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 2);
    };
    play();
    timer.current = setInterval(play, 850);
    setPlaying(true);
  }
  function cue() {
    if (!playing || !context.current || context.current.state !== 'running') return;
    const ctx = context.current,
      oscillator = ctx.createOscillator(),
      envelope = ctx.createGain();
    oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.08);
    envelope.gain.setValueAtTime(0.35, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.connect(envelope);
    envelope.connect(gain.current);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.16);
  }
  return { volume, setVolume, playing, toggle, cue };
}
