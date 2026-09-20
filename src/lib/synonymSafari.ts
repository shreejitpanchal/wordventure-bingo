import type { Difficulty, SynonymSafariCategoryId, WordPair } from '../types';
import { SYNONYM_SAFARI_BANKS } from '../data/synonymSafariBanks';
import { shuffle } from './random';

// Smaller/denser than Sentence Quest's QUESTION_COUNT_OPTIONS (5/10/15/20):
// this is a single-screen tap list, not a paginated quiz -- 8 pairs is
// already 16 simultaneously-tappable cells on one screen.
export const PAIR_COUNT_OPTIONS = [4, 5, 6, 7, 8] as const;
export const MIN_PAIR_COUNT = PAIR_COUNT_OPTIONS[0];
export const MAX_PAIR_COUNT = PAIR_COUNT_OPTIONS[PAIR_COUNT_OPTIONS.length - 1];
export const DEFAULT_PAIR_COUNT = 6;

export function selectSynonymSafariPool(category: SynonymSafariCategoryId, difficulty: Difficulty): WordPair[] {
  return SYNONYM_SAFARI_BANKS[category].pairs.filter((p) => p.difficulty === difficulty);
}

/**
 * Builds one round: `pairCount` pairs with a unique `word` AND a unique
 * `match` across the round (safe even if a bank ever picked up a duplicate
 * `match` text for two different words). Prefers pairs whose `word` isn't in
 * `excludeWords` -- the caller passes in whatever the *previous* round in
 * this session used, so back-to-back rounds don't deal the same small
 * handful of words again just because the pool is modest. Falls back to
 * reusing excluded words only if the pool can't fill a round without them,
 * so this never fails a round it could otherwise complete. Throws loudly if
 * the pool still can't fill a round even allowing repeats -- same
 * convention as sentenceQuest's/cardGeneration's generators.
 */
export function generateRound(
  pool: WordPair[],
  rng: () => number = Math.random,
  pairCount: number = DEFAULT_PAIR_COUNT,
  excludeWords: ReadonlySet<string> = new Set(),
): WordPair[] {
  const targetCount = Math.max(MIN_PAIR_COUNT, Math.min(MAX_PAIR_COUNT, pairCount));
  const shuffled = shuffle(pool, rng);
  const usedWords = new Set<string>();
  const usedMatches = new Set<string>();
  const picked: WordPair[] = [];

  function tryAdd(pair: WordPair): void {
    if (usedWords.has(pair.word) || usedMatches.has(pair.match)) return;
    picked.push(pair);
    usedWords.add(pair.word);
    usedMatches.add(pair.match);
  }

  for (const pair of shuffled) {
    if (picked.length >= targetCount) break;
    if (excludeWords.has(pair.word)) continue;
    tryAdd(pair);
  }
  if (picked.length < targetCount) {
    for (const pair of shuffled) {
      if (picked.length >= targetCount) break;
      tryAdd(pair);
    }
  }

  if (picked.length < targetCount) {
    throw new Error(
      `Not enough unique pairs to build a round: need ${targetCount}, found ${picked.length} usable ` +
        `(pool had ${pool.length}; some may have been skipped for a duplicate word/match value). ` +
        `Add more pairs to this category/difficulty.`,
    );
  }
  return picked;
}

/** Pure grading -- safe as a plain string comparison (not array index)
 * because generateRound guarantees no duplicate word/match within a round. */
export function checkMatch(round: WordPair[], word: string, match: string): boolean {
  return round.some((p) => p.word === word && p.match === match);
}

/** Uniform random pick among still-unmatched pairs, for the hint button --
 * mirrors Wordscapes' revealRandomLetter (repeatable, uniform random).
 * Throws if nothing is left; callers should only invoke this while the
 * round isn't yet complete. */
export function pickHintPair(
  round: WordPair[],
  matchedWords: ReadonlySet<string>,
  rng: () => number = Math.random,
): WordPair {
  const remaining = round.filter((p) => !matchedWords.has(p.word));
  if (remaining.length === 0) {
    throw new Error('pickHintPair called with no remaining unmatched pairs.');
  }
  return shuffle(remaining, rng)[0];
}
