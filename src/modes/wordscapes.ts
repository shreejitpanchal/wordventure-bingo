import { lazy } from 'react';
import type { WordscapesConfig, WordscapesResult, WordscapesStats } from '../types';
import { WORD_BANK_CATEGORIES, WORD_BANK_LABELS } from '../data/wordBankLabels';
import { DEFAULT_WORD_COUNT } from '../lib/wordscapes/gridGeneration';
import WordscapesMenuOptions from '../components/WordscapesMenuOptions';
import { bump, defineMode, sumValues } from './types';

export const DEFAULT_WORDSCAPES_STATS: WordscapesStats = { puzzlesCompleted: {}, bonusWordsFound: {} };

/**
 * `assisted` (any hint used, or Give Up) gates the "puzzles completed"
 * counter only -- an assisted finish isn't a real solve, but bonus words
 * genuinely found are credited either way. Two independent updates; don't
 * collapse them into "skip everything when assisted".
 */
export function recordWordscapesCompletion(
  stats: WordscapesStats,
  category: string,
  result: WordscapesResult,
): WordscapesStats {
  return {
    puzzlesCompleted: result.assisted ? stats.puzzlesCompleted : bump(stats.puzzlesCompleted, category),
    bonusWordsFound:
      result.bonusWordsFound > 0 ? bump(stats.bonusWordsFound, category, result.bonusWordsFound) : stats.bonusWordsFound,
  };
}

export const wordscapesMode = defineMode<WordscapesConfig, WordscapesResult, WordscapesStats>({
  id: 'wordscapes',
  label: 'Wordscapes',
  emoji: '🧩',
  // Shares Bingo's word banks (and therefore its categories) -- see
  // CLAUDE.md's "Wordscapes mode" for why no separate dictionary exists.
  categories: WORD_BANK_CATEGORIES,
  defaultConfig: { category: 'spelling', difficulty: 'easy', wordCount: DEFAULT_WORD_COUNT },
  MenuOptions: WordscapesMenuOptions,
  menuStatLine: (config, stats) => {
    const completed = stats.puzzlesCompleted[config.category] ?? 0;
    return completed > 0 ? `🧩 Puzzles completed in ${WORD_BANK_LABELS[config.category]}: ${completed}` : null;
  },
  GameScreen: lazy(() => import('../components/WordscapesGameScreen')),
  WinScreen: lazy(() => import('../components/WordscapesWinScreen')),
  stats: {
    // Historical key -- predates the mode registry (see bingo.ts).
    key: 'wordscapesStats',
    defaults: DEFAULT_WORDSCAPES_STATS,
    record: (stats, config, result) => recordWordscapesCompletion(stats, config.category, result),
    summary: (stats) => [
      { label: 'Puzzles completed', value: sumValues(stats.puzzlesCompleted) },
      { label: 'Bonus words found', value: sumValues(stats.bonusWordsFound) },
    ],
  },
});
