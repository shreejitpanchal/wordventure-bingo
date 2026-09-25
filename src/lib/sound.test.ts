import { describe, expect, it, vi } from 'vitest';
import { createSoundPlayer, silentSoundPlayer, type SoundName } from './sound';

/** Just enough of AudioContext to observe what play() schedules. */
function fakeContext() {
  const started: number[] = [];
  const stopped: number[] = [];
  const oscillator = {
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(() => ({ connect: vi.fn() })),
    start: vi.fn((t: number) => started.push(t)),
    stop: vi.fn((t: number) => stopped.push(t)),
  };
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(() => ({ connect: vi.fn() })),
  };
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
  };
  return { ctx: ctx as unknown as AudioContext, started, stopped, createOscillator: ctx.createOscillator };
}

describe('createSoundPlayer', () => {
  it('does not create an AudioContext until the first play()', () => {
    const factory = vi.fn(() => fakeContext().ctx);
    const player = createSoundPlayer(factory);
    expect(factory).not.toHaveBeenCalled();
    player.play('tap');
    expect(factory).toHaveBeenCalledTimes(1);
    player.play('tap');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('schedules one oscillator per tone of the effect, in time order', () => {
    const fake = fakeContext();
    const player = createSoundPlayer(() => fake.ctx);
    player.play('win');
    expect(fake.createOscillator).toHaveBeenCalledTimes(4);
    expect(fake.started).toEqual([...fake.started].sort((a, b) => a - b));
    expect(fake.stopped.every((t, i) => t > fake.started[i])).toBe(true);
  });

  it('is silent while disabled and never touches the context', () => {
    const factory = vi.fn(() => fakeContext().ctx);
    const player = createSoundPlayer(factory);
    player.setEnabled(false);
    expect(player.isEnabled()).toBe(false);
    player.play('correct');
    expect(factory).not.toHaveBeenCalled();
    player.setEnabled(true);
    player.play('correct');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('degrades to a no-op when no AudioContext is available (e.g. old WebView, node)', () => {
    const player = createSoundPlayer(() => null);
    const names: SoundName[] = ['tap', 'select', 'correct', 'wrong', 'tick', 'win', 'bigWin'];
    for (const name of names) expect(() => player.play(name)).not.toThrow();
  });

  it('silentSoundPlayer never reports itself enabled', () => {
    silentSoundPlayer.setEnabled(true);
    expect(silentSoundPlayer.isEnabled()).toBe(false);
    expect(() => silentSoundPlayer.play('bigWin')).not.toThrow();
  });
});
