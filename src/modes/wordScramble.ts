import { lazy } from 'react';
import type { WordScrambleConfig, WordScrambleResult, WordScrambleStats } from '../types';
import { WORD_BANK_CATEGORIES, WORD_BANK_LABELS } from '../data/wordBankLabels';
import { DEFAULT_SCRAMBLE_WORDS } from '../lib/wordScramble';
import WordScrambleMenuOptions from '../components/WordScrambleMenuOptions';
import { bump, defineMode, sumValues } from './types';

export const DEFAULT_WORD_SCRAMBLE_STATS: WordScrambleStats = { roundsCompleted: {}, wordsSolved: {} };

/**
 * Same shape as Wordscapes/Synonym Safari: `assisted` (a hint or Skip)
 * gates "rounds completed" only, while every word the player actually
 * spelled is credited either way.
 */
export function recordWordScrambleRound(
  stats: WordScrambleStats,
  category: string,
  result: WordScrambleResult,
): WordScrambleStats {
  return {
    roundsCompleted: result.assisted ? stats.roundsCompleted : bump(stats.roundsCompleted, category),
    wordsSolved: result.wordsSolved > 0 ? bump(stats.wordsSolved, category, result.wordsSolved) : stats.wordsSolved,
  };
}

export const wordScrambleMode = defineMode<WordScrambleConfig, WordScrambleResult, WordScrambleStats>({
  id: 'word-scramble',
  label: 'Word Scramble',
  emoji: '🔀',
  // Shares Bingo's word banks: every entry already has a definition, which
  // is the only clue this mode needs.
  categories: WORD_BANK_CATEGORIES,
  defaultConfig: { category: 'spelling', difficulty: 'easy', wordCount: DEFAULT_SCRAMBLE_WORDS },
  MenuOptions: WordScrambleMenuOptions,
  menuStatLine: (config, stats) => {
    const rounds = stats.roundsCompleted[config.category] ?? 0;
    return rounds > 0 ? `🔀 Rounds completed in ${WORD_BANK_LABELS[config.category]}: ${rounds}` : null;
  },
  GameScreen: lazy(() => import('../components/WordScrambleScreen')),
  WinScreen: lazy(() => import('../components/WordScrambleWinScreen')),
  stats: {
    key: 'wordScrambleStats',
    defaults: DEFAULT_WORD_SCRAMBLE_STATS,
    record: (stats, config, result) => recordWordScrambleRound(stats, config.category, result),
    summary: (stats) => [
      { label: 'Rounds completed', value: sumValues(stats.roundsCompleted) },
      { label: 'Words unscrambled', value: sumValues(stats.wordsSolved) },
    ],
  },
});
