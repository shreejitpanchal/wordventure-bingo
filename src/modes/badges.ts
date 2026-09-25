import type { GameMode } from '../types';
import type { ModeStatsRecord } from './types';
import { maxValue, sumValues } from './types';

/**
 * Badges and the level bar are *derived* from the per-mode stats records the
 * app already persists -- nothing new is stored. That keeps them impossible
 * to get out of sync with the stats and means a new badge is one entry in
 * BADGE_RULES, not a migration.
 */

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: boolean;
}

export type StatsByMode = Record<GameMode, ModeStatsRecord>;

function field(stats: StatsByMode, mode: GameMode, name: string): Record<string, number> {
  return stats[mode]?.[name] ?? {};
}

interface BadgeRule {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: (stats: StatsByMode) => boolean;
}

const BADGE_RULES: BadgeRule[] = [
  {
    id: 'first-bingo',
    emoji: '🎯',
    title: 'First Bingo!',
    description: 'Win your first game of Bingo.',
    earned: (s) => sumValues(field(s, 'bingo', 'wins')) >= 1,
  },
  {
    id: 'bingo-10',
    emoji: '🏅',
    title: 'Bingo Boss',
    description: 'Win 10 games of Bingo.',
    earned: (s) => sumValues(field(s, 'bingo', 'wins')) >= 10,
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    title: 'On a Roll',
    description: 'Win 3 Bingo games in a row.',
    earned: (s) => maxValue(field(s, 'bingo', 'bestStreak')) >= 3,
  },
  {
    id: 'streak-5',
    emoji: '🌋',
    title: 'Unstoppable',
    description: 'Win 5 Bingo games in a row.',
    earned: (s) => maxValue(field(s, 'bingo', 'bestStreak')) >= 5,
  },
  {
    id: 'puzzle-1',
    emoji: '🧩',
    title: 'Puzzle Cracker',
    description: 'Solve a Wordscapes puzzle with no hints.',
    earned: (s) => sumValues(field(s, 'wordscapes', 'puzzlesCompleted')) >= 1,
  },
  {
    id: 'puzzle-10',
    emoji: '🗝️',
    title: 'Grid Master',
    description: 'Solve 10 Wordscapes puzzles with no hints.',
    earned: (s) => sumValues(field(s, 'wordscapes', 'puzzlesCompleted')) >= 10,
  },
  {
    id: 'bonus-25',
    emoji: '⭐',
    title: 'Bonus Hunter',
    description: 'Find 25 bonus words in Wordscapes.',
    earned: (s) => sumValues(field(s, 'wordscapes', 'bonusWordsFound')) >= 25,
  },
  {
    id: 'quest-50',
    emoji: '📝',
    title: 'Grammar Guru',
    description: 'Answer 50 Sentence Quest questions correctly.',
    earned: (s) => sumValues(field(s, 'sentence-quest', 'correctAnswers')) >= 50,
  },
  {
    id: 'quest-rounds-10',
    emoji: '📚',
    title: 'Bookworm',
    description: 'Complete 10 Sentence Quest rounds.',
    earned: (s) => sumValues(field(s, 'sentence-quest', 'roundsCompleted')) >= 10,
  },
  {
    id: 'safari-50',
    emoji: '🦁',
    title: 'Safari Scout',
    description: 'Match 50 pairs in Synonym Safari.',
    earned: (s) => sumValues(field(s, 'synonym-safari', 'pairsMatched')) >= 50,
  },
  {
    id: 'safari-rounds-10',
    emoji: '🐘',
    title: 'Trail Blazer',
    description: 'Finish 10 Synonym Safari rounds with no hints.',
    earned: (s) => sumValues(field(s, 'synonym-safari', 'roundsCompleted')) >= 10,
  },
  {
    id: 'explorer',
    emoji: '🧭',
    title: 'Explorer',
    description: 'Finish something in every mode.',
    earned: (s) =>
      sumValues(field(s, 'bingo', 'gamesPlayed')) >= 1 &&
      sumValues(field(s, 'wordscapes', 'puzzlesCompleted')) + sumValues(field(s, 'wordscapes', 'bonusWordsFound')) >= 1 &&
      sumValues(field(s, 'sentence-quest', 'roundsCompleted')) >= 1 &&
      sumValues(field(s, 'synonym-safari', 'pairsMatched')) >= 1,
  },
];

export function computeBadges(stats: StatsByMode): Badge[] {
  return BADGE_RULES.map(({ earned, ...badge }) => ({ ...badge, earned: earned(stats) }));
}

// --- Level bar ---------------------------------------------------------------

export interface LevelInfo {
  level: number;
  title: string;
  /** Finished games/puzzles/rounds across every mode. */
  total: number;
  /** Progress into the current level, 0..1. */
  progress: number;
  /** Wins still needed to reach the next level. */
  toNext: number;
}

const LEVEL_TITLES = [
  'Word Sprout',
  'Letter Explorer',
  'Spelling Scout',
  'Vocab Voyager',
  'Grammar Guru',
  'Puzzle Pro',
  'Word Wizard',
  'Bingo Boss',
  'Language Legend',
  'Wordventure Champion',
];

/** Level n starts at 5 * n * (n - 1) / 2 wins: 0, 5, 15, 30, 50, ... -- each
 * level costs 5 more than the last, so early levels come fast (a kid sees
 * the bar move on day one) and later ones stay meaningful. */
export function levelStart(level: number): number {
  return (5 * level * (level - 1)) / 2;
}

/** Total finished games across every mode's completion counter. */
export function totalWins(stats: StatsByMode): number {
  return (
    sumValues(field(stats, 'bingo', 'wins')) +
    sumValues(field(stats, 'wordscapes', 'puzzlesCompleted')) +
    sumValues(field(stats, 'sentence-quest', 'roundsCompleted')) +
    sumValues(field(stats, 'synonym-safari', 'roundsCompleted'))
  );
}

export function computeLevel(stats: StatsByMode): LevelInfo {
  const total = totalWins(stats);
  let level = 1;
  while (levelStart(level + 1) <= total) level++;
  const start = levelStart(level);
  const next = levelStart(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
    total,
    progress: (total - start) / (next - start),
    toNext: next - total,
  };
}
