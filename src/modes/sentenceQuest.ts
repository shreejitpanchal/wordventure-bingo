import { lazy } from 'react';
import type { SentenceQuestConfig, SentenceQuestResult, SentenceQuestStats } from '../types';
import { SENTENCE_QUEST_CATEGORIES, SENTENCE_QUEST_LABELS } from '../data/sentenceQuestLabels';
import { DEFAULT_QUESTION_COUNT } from '../lib/sentenceQuest';
import SentenceQuestMenuOptions from '../components/SentenceQuestMenuOptions';
import { bump, defineMode, sumValues } from './types';

export const DEFAULT_SENTENCE_QUEST_STATS: SentenceQuestStats = {
  roundsCompleted: {},
  correctAnswers: {},
  questionsAnswered: {},
};

/**
 * A completed round credits everything. `correctAnswers`/`questionsAnswered`
 * are kept separate from `roundsCompleted` so a future abandon-partway path
 * could credit the questions actually answered without counting a full
 * round -- the same split Wordscapes makes between bonus words and puzzles
 * completed.
 */
export function recordSentenceQuestRound(
  stats: SentenceQuestStats,
  category: string,
  result: SentenceQuestResult,
): SentenceQuestStats {
  return {
    roundsCompleted: bump(stats.roundsCompleted, category),
    correctAnswers: bump(stats.correctAnswers, category, result.correctCount),
    questionsAnswered: bump(stats.questionsAnswered, category, result.totalCount),
  };
}

export const sentenceQuestMode = defineMode<SentenceQuestConfig, SentenceQuestResult, SentenceQuestStats>({
  id: 'sentence-quest',
  label: 'Sentence Quest',
  emoji: '📝',
  categories: SENTENCE_QUEST_CATEGORIES,
  defaultConfig: { category: 'verbTense', difficulty: 'easy', questionCount: DEFAULT_QUESTION_COUNT },
  MenuOptions: SentenceQuestMenuOptions,
  menuStatLine: (config, stats) => {
    const rounds = stats.roundsCompleted[config.category] ?? 0;
    return rounds > 0 ? `📝 Rounds completed in ${SENTENCE_QUEST_LABELS[config.category]}: ${rounds}` : null;
  },
  GameScreen: lazy(() => import('../components/SentenceQuestScreen')),
  WinScreen: lazy(() => import('../components/SentenceQuestWinScreen')),
  stats: {
    key: 'sentenceQuestStats',
    defaults: DEFAULT_SENTENCE_QUEST_STATS,
    record: (stats, config, result) => recordSentenceQuestRound(stats, config.category, result),
    summary: (stats) => [
      { label: 'Rounds completed', value: sumValues(stats.roundsCompleted) },
      { label: 'Correct answers', value: sumValues(stats.correctAnswers) },
    ],
  },
});
