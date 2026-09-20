import { describe, expect, it } from 'vitest';
import type { WordPair } from '../types';
import {
  DEFAULT_PAIR_COUNT,
  MAX_PAIR_COUNT,
  MIN_PAIR_COUNT,
  checkMatch,
  generateRound,
  pickHintPair,
  selectSynonymSafariPool,
} from './synonymSafari';
import { seededRng, sequenceRng } from '../test/rng';

function makePairs(count: number, difficulty: WordPair['difficulty'] = 'easy'): WordPair[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i}`,
    match: `match${i}`,
    difficulty,
  }));
}

describe('selectSynonymSafariPool', () => {
  it('filters synonyms and antonyms by difficulty independently', () => {
    expect(selectSynonymSafariPool('synonyms', 'easy').length).toBeGreaterThan(0);
    expect(selectSynonymSafariPool('synonyms', 'easy').every((p) => p.difficulty === 'easy')).toBe(true);
    expect(selectSynonymSafariPool('antonyms', 'hard').every((p) => p.difficulty === 'hard')).toBe(true);
  });
});

describe('generateRound', () => {
  it('throws with an actionable message when the pool is smaller than pairCount', () => {
    const pool = makePairs(MIN_PAIR_COUNT - 1);
    expect(() => generateRound(pool, Math.random, MIN_PAIR_COUNT)).toThrow(/Not enough unique pairs/);
  });

  it('builds a round of the requested size with no duplicate word or match', () => {
    const pool = makePairs(DEFAULT_PAIR_COUNT + 10);
    const round = generateRound(pool, seededRng(1), DEFAULT_PAIR_COUNT);
    expect(round).toHaveLength(DEFAULT_PAIR_COUNT);
    expect(new Set(round.map((p) => p.word)).size).toBe(DEFAULT_PAIR_COUNT);
    expect(new Set(round.map((p) => p.match)).size).toBe(DEFAULT_PAIR_COUNT);
  });

  it('clamps an out-of-range pairCount into MIN_PAIR_COUNT/MAX_PAIR_COUNT', () => {
    const pool = makePairs(MAX_PAIR_COUNT + 10);
    expect(generateRound(pool, seededRng(2), 1)).toHaveLength(MIN_PAIR_COUNT);
    expect(generateRound(pool, seededRng(3), 100)).toHaveLength(MAX_PAIR_COUNT);
  });

  it('never returns two pairs sharing the same word, even if the pool has a collision', () => {
    // A bank shouldn't have duplicate `word` values by authoring convention,
    // but this guards the round generator itself against ever surfacing two
    // visually-identical left-column cells if that convention is ever
    // violated (or a future relation type reintroduces cross-bank mixing).
    const pool: WordPair[] = [
      { word: 'happy', match: 'joyful', difficulty: 'easy' },
      { word: 'happy', match: 'glad', difficulty: 'easy' },
      ...makePairs(MIN_PAIR_COUNT, 'easy'),
    ];
    const round = generateRound(pool, seededRng(4), MIN_PAIR_COUNT);
    const happyEntries = round.filter((p) => p.word === 'happy');
    expect(happyEntries.length).toBeLessThanOrEqual(1);
  });

  it('avoids excludeWords when the pool has enough other pairs', () => {
    const pool = makePairs(DEFAULT_PAIR_COUNT + 10);
    const excludeWords = new Set(pool.slice(0, DEFAULT_PAIR_COUNT).map((p) => p.word));
    const round = generateRound(pool, seededRng(5), DEFAULT_PAIR_COUNT, excludeWords);
    expect(round.every((p) => !excludeWords.has(p.word))).toBe(true);
  });

  it('falls back to reusing excluded words when the pool is too small to avoid them', () => {
    const pool = makePairs(MIN_PAIR_COUNT);
    const excludeWords = new Set(pool.map((p) => p.word));
    const round = generateRound(pool, seededRng(6), MIN_PAIR_COUNT, excludeWords);
    expect(round).toHaveLength(MIN_PAIR_COUNT);
  });
});

describe('checkMatch', () => {
  const round: WordPair[] = [
    { word: 'happy', match: 'joyful', difficulty: 'easy' },
    { word: 'big', match: 'large', difficulty: 'easy' },
  ];

  it('is true for a genuine pair', () => {
    expect(checkMatch(round, 'happy', 'joyful')).toBe(true);
  });

  it('is false for a mismatched word/match combination', () => {
    expect(checkMatch(round, 'happy', 'large')).toBe(false);
  });

  it('is false for a word/match from outside the round', () => {
    expect(checkMatch(round, 'small', 'tiny')).toBe(false);
  });
});

describe('pickHintPair', () => {
  const round: WordPair[] = [
    { word: 'happy', match: 'joyful', difficulty: 'easy' },
    { word: 'big', match: 'large', difficulty: 'easy' },
  ];

  it('returns a pair not already in matchedWords', () => {
    const matched = new Set(['happy']);
    const hint = pickHintPair(round, matched, sequenceRng(0));
    expect(hint.word).toBe('big');
  });

  it('throws when matchedWords already covers the whole round', () => {
    const matched = new Set(['happy', 'big']);
    expect(() => pickHintPair(round, matched)).toThrow(/no remaining unmatched pairs/);
  });
});
