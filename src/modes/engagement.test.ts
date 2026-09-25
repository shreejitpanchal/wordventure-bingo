import { describe, expect, it } from 'vitest';
import type { GameMode } from '../types';
import { MODES } from './index';
import type { ModeStatsRecord } from './types';
import { computeBadges, computeLevel, levelStart, type StatsByMode } from './badges';
import { advanceDailyStreak, dailyChallenge, dateKey, dateSeed, isDailyStreakAlive, previousDateKey } from './daily';

function emptyStats(): StatsByMode {
  return Object.fromEntries(MODES.map((m) => [m.id, m.stats.defaults])) as StatsByMode;
}

function withStats(patch: Partial<Record<GameMode, ModeStatsRecord>>): StatsByMode {
  return { ...emptyStats(), ...patch } as StatsByMode;
}

describe('badges', () => {
  it('are all locked with empty stats and have unique ids', () => {
    const badges = computeBadges(emptyStats());
    expect(badges.length).toBeGreaterThan(5);
    expect(badges.every((b) => !b.earned)).toBe(true);
    expect(new Set(badges.map((b) => b.id)).size).toBe(badges.length);
  });

  it('unlock from the stats the modes already record', () => {
    const badges = computeBadges(
      withStats({
        bingo: { gamesPlayed: { a: 12 }, wins: { a: 10 }, currentStreak: {}, bestStreak: { a: 3 } },
        wordscapes: { puzzlesCompleted: { a: 1 }, bonusWordsFound: {} },
      }),
    );
    const earned = new Set(badges.filter((b) => b.earned).map((b) => b.id));
    expect(earned).toEqual(new Set(['first-bingo', 'bingo-10', 'streak-3', 'puzzle-1']));
  });

  it('Explorer needs every mode touched', () => {
    const almost = withStats({
      bingo: { gamesPlayed: { a: 1 }, wins: {}, currentStreak: {}, bestStreak: {} },
      wordscapes: { puzzlesCompleted: {}, bonusWordsFound: { a: 1 } },
      'sentence-quest': { roundsCompleted: { a: 1 }, correctAnswers: {}, questionsAnswered: {} },
    });
    expect(computeBadges(almost).find((b) => b.id === 'explorer')?.earned).toBe(false);
    const all = withStats({ ...almost, 'synonym-safari': { roundsCompleted: {}, pairsMatched: { a: 1 } } });
    expect(computeBadges(all).find((b) => b.id === 'explorer')?.earned).toBe(true);
  });
});

describe('level', () => {
  it('starts at level 1 with an empty bar', () => {
    const info = computeLevel(emptyStats());
    expect(info).toMatchObject({ level: 1, total: 0, progress: 0, toNext: 5 });
    expect(info.title).toBe('Word Sprout');
  });

  it('level thresholds grow by 5 each level', () => {
    expect([1, 2, 3, 4, 5].map(levelStart)).toEqual([0, 5, 15, 30, 50]);
  });

  it('sums completions across modes and reports progress into the level', () => {
    const info = computeLevel(
      withStats({
        bingo: { gamesPlayed: {}, wins: { a: 4 }, currentStreak: {}, bestStreak: {} },
        'synonym-safari': { roundsCompleted: { a: 3 }, pairsMatched: {} },
      }),
    );
    // 7 wins: level 2 spans 5..15, so 2/10 of the way.
    expect(info.level).toBe(2);
    expect(info.total).toBe(7);
    expect(info.progress).toBeCloseTo(0.2);
    expect(info.toNext).toBe(8);
  });

  it('caps the title at the last one for very high levels', () => {
    const info = computeLevel(withStats({ bingo: { gamesPlayed: {}, wins: { a: 5000 }, currentStreak: {}, bestStreak: {} } }));
    expect(info.level).toBeGreaterThan(10);
    expect(info.title).toBe('Wordventure Champion');
  });
});

describe('daily challenge', () => {
  it('formats local dates and steps back a day across month boundaries', () => {
    expect(dateKey(new Date(2026, 2, 1))).toBe('2026-03-01');
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDateKey('2026-01-01')).toBe('2025-12-31');
  });

  it('is deterministic per day and differs between days', () => {
    const a = dailyChallenge('2026-09-25', MODES);
    const b = dailyChallenge('2026-09-25', MODES);
    expect(a.mode.id).toBe(b.mode.id);
    expect(a.config).toEqual(b.config);
    expect(a.makeRng()()).toBe(b.makeRng()());
    const seeds = new Set(['2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'].map(dateSeed));
    expect(seeds.size).toBe(4);
  });

  it('always picks a category the chosen mode offers', () => {
    for (let d = 1; d <= 28; d++) {
      const { mode, config } = dailyChallenge(`2026-02-${String(d).padStart(2, '0')}`, MODES);
      expect(mode.categories.map((c) => c.id)).toContain(config.category);
    }
  });

  it('advances the streak on consecutive days, restarts after a gap, ignores repeats', () => {
    let r = advanceDailyStreak({ lastCompleted: null, streak: 0 }, '2026-09-24');
    expect(r).toEqual({ lastCompleted: '2026-09-24', streak: 1 });
    r = advanceDailyStreak(r, '2026-09-25');
    expect(r.streak).toBe(2);
    expect(advanceDailyStreak(r, '2026-09-25')).toBe(r);
    r = advanceDailyStreak(r, '2026-09-28');
    expect(r).toEqual({ lastCompleted: '2026-09-28', streak: 1 });
  });

  it('reports the streak alive for today or yesterday only', () => {
    const r = { lastCompleted: '2026-09-24', streak: 3 };
    expect(isDailyStreakAlive(r, '2026-09-24')).toBe(true);
    expect(isDailyStreakAlive(r, '2026-09-25')).toBe(true);
    expect(isDailyStreakAlive(r, '2026-09-26')).toBe(false);
  });
});
