import { useEffect, useRef, useState } from 'react';
export default function useAudio() {
  const [volume, setVolume] = useState(25);
  const [playing, setPlaying] = useState(false);
  const context = useRef(null);
  const gain = useRef(null);
  const timer = useRef(null);
  useEffect(() => {
    if (gain.current) gain.current.gain.value = (volume / 100) * 0.12;
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
      oscillator.frequency.value = notes[i++ % notes.length];
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
  return { volume, setVolume, playing, toggle };
}
