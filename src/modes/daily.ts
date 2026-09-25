import type { DailyRecord, Difficulty } from '../types';
import type { AnyMode, ModeConfigBase } from './types';
import { seededRng } from '../lib/random';

/**
 * Daily challenge: one fixed setup per calendar day, and a seeded rng so
 * everyone playing it gets the same card/puzzle/round. No backend -- the
 * date is the seed. The "days played in a row" flame is the only new thing
 * persisted (DailyRecord, per profile).
 */

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/** Local-time YYYY-MM-DD -- a kid's "today" is the device's day, not UTC's. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

/** Small string hash (FNV-1a) so the same key always seeds the same rng. */
export function dateSeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface DailyChallenge {
  mode: AnyMode;
  config: ModeConfigBase;
  /** The rng a game screen should generate from so the round is the same
   * for everyone that day. Fresh each call, so a replay is identical too. */
  makeRng: () => () => number;
}

export function dailyChallenge(key: string, modes: readonly AnyMode[]): DailyChallenge {
  const pick = seededRng(dateSeed(key));
  const mode = modes[Math.floor(pick() * modes.length)];
  const category = mode.categories[Math.floor(pick() * mode.categories.length)].id;
  const difficulty = DIFFICULTIES[Math.floor(pick() * DIFFICULTIES.length)];
  return {
    mode,
    config: { ...mode.defaultConfig, category, difficulty },
    // Offset from the pick seed so the puzzle's own draws don't replay the
    // exact sequence used to choose the mode/category.
    makeRng: () => seededRng(dateSeed(key) ^ 0x9e3779b9),
  };
}

export const EMPTY_DAILY_RECORD: DailyRecord = { lastCompleted: null, streak: 0 };

/** True if the streak is still going: played today or yesterday. */
export function isDailyStreakAlive(record: DailyRecord, todayKey: string): boolean {
  return record.lastCompleted === todayKey || record.lastCompleted === previousDateKey(todayKey);
}

/**
 * Applies a completed daily challenge. Completing today's twice is a no-op;
 * completing on consecutive days extends the streak; a gap restarts it at 1.
 */
export function advanceDailyStreak(record: DailyRecord, todayKey: string): DailyRecord {
  if (record.lastCompleted === todayKey) return record;
  const consecutive = record.lastCompleted === previousDateKey(todayKey);
  return { lastCompleted: todayKey, streak: consecutive ? record.streak + 1 : 1 };
}
