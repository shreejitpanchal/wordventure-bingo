import { lazy } from 'react';
import type { SynonymSafariConfig, SynonymSafariResult, SynonymSafariStats } from '../types';
import { SYNONYM_SAFARI_CATEGORIES, SYNONYM_SAFARI_LABELS } from '../data/synonymSafariLabels';
import { DEFAULT_PAIR_COUNT } from '../lib/synonymSafari';
import SynonymSafariMenuOptions from '../components/SynonymSafariMenuOptions';
import { bump, defineMode, sumValues } from './types';

export const DEFAULT_SYNONYM_SAFARI_STATS: SynonymSafariStats = { roundsCompleted: {}, pairsMatched: {} };

/**
 * Mirrors Wordscapes, not Sentence Quest: `assisted` (hint used) gates
 * "rounds completed" only, while every pair locked in is credited either
 * way -- there's no wrong-pair outcome here to weigh pairsMatched against.
 */
export function recordSynonymSafariRound(
  stats: SynonymSafariStats,
  category: string,
  result: SynonymSafariResult,
): SynonymSafariStats {
  return {
    roundsCompleted: result.assisted ? stats.roundsCompleted : bump(stats.roundsCompleted, category),
    pairsMatched: result.pairsMatched > 0 ? bump(stats.pairsMatched, category, result.pairsMatched) : stats.pairsMatched,
  };
}

export const synonymSafariMode = defineMode<SynonymSafariConfig, SynonymSafariResult, SynonymSafariStats>({
  id: 'synonym-safari',
  label: 'Synonym Safari',
  emoji: '🔗',
  categories: SYNONYM_SAFARI_CATEGORIES,
  defaultConfig: { category: 'synonyms', difficulty: 'easy', pairCount: DEFAULT_PAIR_COUNT },
  MenuOptions: SynonymSafariMenuOptions,
  menuStatLine: (config, stats) => {
    const rounds = stats.roundsCompleted[config.category] ?? 0;
    return rounds > 0 ? `🔗 Rounds completed in ${SYNONYM_SAFARI_LABELS[config.category]}: ${rounds}` : null;
  },
  GameScreen: lazy(() => import('../components/SynonymSafariScreen')),
  WinScreen: lazy(() => import('../components/SynonymSafariWinScreen')),
  stats: {
    key: 'synonymSafariStats',
    defaults: DEFAULT_SYNONYM_SAFARI_STATS,
    record: (stats, config, result) => recordSynonymSafariRound(stats, config.category, result),
    summary: (stats) => [
      { label: 'Rounds completed', value: sumValues(stats.roundsCompleted) },
      { label: 'Pairs matched', value: sumValues(stats.pairsMatched) },
    ],
  },
});
