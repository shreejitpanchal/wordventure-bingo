import { lazy } from 'react';
import type { BingoResult, GameConfig, Streaks } from '../types';
import { WORD_BANK_CATEGORIES, WORD_BANK_LABELS } from '../data/wordBankLabels';
import { DEFAULT_CALL_SECONDS } from '../lib/caller';
import BingoMenuOptions from '../components/BingoMenuOptions';
import { bump, defineMode, maxValue, sumValues } from './types';

/**
 * Bingo -- the original word-bingo game. This file is the template for a
 * mode descriptor: everything App.tsx/MenuScreen/SettingsScreen need to
 * drive the mode lives here, and nothing about Bingo lives in those three.
 */

export const DEFAULT_STREAKS: Streaks = { gamesPlayed: {}, wins: {}, currentStreak: {}, bestStreak: {} };

/**
 * A win extends the category's current streak and may set a new best. In
 * Pass & Play the win is credited to the active profile whichever card won:
 * the profile is the device's named player, the second card is an unnamed
 * guest, and there's no second profile to credit instead.
 */
export function recordBingoWin(stats: Streaks, category: string): Streaks {
  const currentStreak = bump(stats.currentStreak, category);
  return {
    gamesPlayed: bump(stats.gamesPlayed, category),
    wins: bump(stats.wins, category),
    currentStreak,
    bestStreak: { ...stats.bestStreak, [category]: Math.max(stats.bestStreak[category] ?? 0, currentStreak[category]) },
  };
}

/**
 * Leaving a Bingo game before anyone wins counts as a loss: it's the only
 * way a Bingo game ends without a win, so without this `gamesPlayed` would
 * always equal `wins` and a "streak" could never break -- which made the
 * streak stat meaningless. Wired via `stats.recordAbandon` below, which
 * App.tsx applies on the visible Menu button and hardware back alike.
 */
export function recordBingoLoss(stats: Streaks, category: string): Streaks {
  return {
    ...stats,
    gamesPlayed: bump(stats.gamesPlayed, category),
    currentStreak: { ...stats.currentStreak, [category]: 0 },
  };
}

export const bingoMode = defineMode<GameConfig, BingoResult, Streaks>({
  id: 'bingo',
  label: 'Bingo',
  emoji: '🎯',
  categories: WORD_BANK_CATEGORIES,
  defaultConfig: { category: 'spelling', difficulty: 'easy', players: 1, callSeconds: DEFAULT_CALL_SECONDS },
  MenuOptions: BingoMenuOptions,
  menuStatLine: (config, stats) => {
    const best = stats.bestStreak[config.category] ?? 0;
    return best > 0 ? `🔥 Best streak in ${WORD_BANK_LABELS[config.category]}: ${best}` : null;
  },
  GameScreen: lazy(() => import('../components/GameScreen')),
  WinScreen: lazy(() => import('../components/WinScreen')),
  stats: {
    // Historical key -- predates the mode registry; existing players' data
    // lives under it (and createProfile's legacy migration targets it).
    key: 'streaks',
    defaults: DEFAULT_STREAKS,
    record: (stats, config) => recordBingoWin(stats, config.category),
    recordAbandon: (stats, config) => recordBingoLoss(stats, config.category),
    summary: (stats) => [
      { label: 'Games played', value: sumValues(stats.gamesPlayed) },
      { label: 'Wins', value: sumValues(stats.wins) },
      { label: 'Best streak', value: maxValue(stats.bestStreak) },
    ],
  },
});
