/**
 * Tiny synthesised sound effects via the Web Audio API -- no audio assets,
 * so nothing to download, nothing to precache, and it works offline like
 * everything else here. Each effect is a short sequence of tones with a
 * quick attack/decay envelope; "chiptune" rather than realistic, which
 * suits the app's emoji-and-CSS look.
 *
 * Built as a factory (not a module-level singleton) so App.tsx owns the one
 * instance and passes it down explicitly (via ModeContext / props), matching
 * how every other cross-cutting dependency flows in this codebase. The
 * AudioContext is created lazily on the first play(): browsers refuse to
 * start one before a user gesture, and every play() here happens inside a
 * tap handler or right after one.
 */

export type SoundName = 'tap' | 'select' | 'correct' | 'wrong' | 'tick' | 'win' | 'bigWin';

export interface SoundPlayer {
  play(name: SoundName): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}

interface Tone {
  /** Hz */
  freq: number;
  /** seconds */
  duration: number;
  /** seconds after the effect starts */
  at: number;
  type?: OscillatorType;
  gain?: number;
}

const EFFECTS: Record<SoundName, Tone[]> = {
  tap: [{ freq: 520, duration: 0.06, at: 0, type: 'square', gain: 0.12 }],
  select: [
    { freq: 660, duration: 0.07, at: 0, type: 'triangle', gain: 0.16 },
    { freq: 880, duration: 0.08, at: 0.06, type: 'triangle', gain: 0.14 },
  ],
  correct: [
    { freq: 523, duration: 0.1, at: 0, type: 'triangle', gain: 0.2 },
    { freq: 659, duration: 0.1, at: 0.09, type: 'triangle', gain: 0.2 },
    { freq: 784, duration: 0.16, at: 0.18, type: 'triangle', gain: 0.22 },
  ],
  wrong: [
    { freq: 220, duration: 0.12, at: 0, type: 'sawtooth', gain: 0.12 },
    { freq: 165, duration: 0.18, at: 0.1, type: 'sawtooth', gain: 0.12 },
  ],
  tick: [{ freq: 1200, duration: 0.03, at: 0, type: 'square', gain: 0.08 }],
  win: [
    { freq: 523, duration: 0.12, at: 0, type: 'triangle', gain: 0.22 },
    { freq: 659, duration: 0.12, at: 0.12, type: 'triangle', gain: 0.22 },
    { freq: 784, duration: 0.12, at: 0.24, type: 'triangle', gain: 0.22 },
    { freq: 1047, duration: 0.3, at: 0.36, type: 'triangle', gain: 0.26 },
  ],
  bigWin: [
    { freq: 523, duration: 0.1, at: 0, type: 'square', gain: 0.16 },
    { freq: 659, duration: 0.1, at: 0.1, type: 'square', gain: 0.16 },
    { freq: 784, duration: 0.1, at: 0.2, type: 'square', gain: 0.16 },
    { freq: 1047, duration: 0.1, at: 0.3, type: 'square', gain: 0.16 },
    { freq: 784, duration: 0.1, at: 0.4, type: 'triangle', gain: 0.2 },
    { freq: 1047, duration: 0.1, at: 0.5, type: 'triangle', gain: 0.2 },
    { freq: 1319, duration: 0.45, at: 0.6, type: 'triangle', gain: 0.26 },
    { freq: 1568, duration: 0.45, at: 0.6, type: 'sine', gain: 0.12 },
  ],
};

function defaultContextFactory(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null;
  try {
    return new window.AudioContext();
  } catch {
    return null;
  }
}

export function createSoundPlayer(createContext: () => AudioContext | null = defaultContextFactory): SoundPlayer {
  let enabled = true;
  let context: AudioContext | null | undefined; // undefined = not tried yet

  function getContext(): AudioContext | null {
    if (context === undefined) context = createContext();
    if (context && context.state === 'suspended') {
      // A context created before the first gesture starts suspended; resume
      // is a no-op if it's already running and rejects harmlessly otherwise.
      context.resume().catch(() => {});
    }
    return context;
  }

  function play(name: SoundName): void {
    if (!enabled) return;
    const ctx = getContext();
    if (!ctx) return;
    const start = ctx.currentTime + 0.01;
    for (const tone of EFFECTS[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? 'sine';
      osc.frequency.setValueAtTime(tone.freq, start + tone.at);
      const peak = tone.gain ?? 0.2;
      const t0 = start + tone.at;
      const t1 = t0 + tone.duration;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  }

  return {
    play,
    setEnabled(next) {
      enabled = next;
    },
    isEnabled() {
      return enabled;
    },
  };
}

/** A player that never makes a sound -- for tests and for contexts (like a
 * lazily-mounted screen in a unit test) that don't have an App around. */
export const silentSoundPlayer: SoundPlayer = {
  play() {},
  setEnabled() {},
  isEnabled() {
    return false;
  },
};
