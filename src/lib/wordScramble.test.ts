import { describe, expect, it } from 'vitest';
import type { WordEntry } from '../types';
import {
  DEFAULT_SCRAMBLE_WORDS,
  MAX_SCRAMBLE_WORDS,
  MIN_SCRAMBLE_WORDS,
  correctPrefix,
  generateRound,
  isCorrect,
  selectScramblePool,
  spell,
  type ScrambleWord,
} from './wordScramble';
import { seededRng } from '../test/rng';

function entry(word: string, difficulty: WordEntry['difficulty'] = 'easy'): WordEntry {
  return { word, difficulty, definition: `Definition of ${word}.` };
}

const WORDS = ['CAT', 'DOG', 'FISH', 'BIRD', 'HORSE', 'MOUSE', 'TIGER', 'ZEBRA', 'OTTER', 'PANDA', 'KOALA', 'LLAMA'];
const POOL = WORDS.map((w) => entry(w));

describe('selectScramblePool', () => {
  it('applies the difficulty tier and its length cap', () => {
    const words = [entry('CAT'), entry('GIRAFFE'), entry('ELEPHANT', 'medium'), entry('PHOTOSYNTHESIS', 'hard')];
    expect(selectScramblePool(words, 'animals', 'easy').map((w) => w.word)).toEqual(['CAT']);
    expect(selectScramblePool(words, 'animals', 'medium').map((w) => w.word)).toEqual(['ELEPHANT']);
    expect(selectScramblePool(words, 'animals', 'hard')).toEqual([]);
  });

  it('drops Free Play words that cannot be tiles or are too short', () => {
    const words = [entry('OK'), entry('ICE CREAM'), entry('T-REX'), entry('R2D2'), entry('MOON', 'hard')];
    // freeplay ignores the tier (selectWordPool), but not the length/letters filter.
    expect(selectScramblePool(words, 'freeplay', 'easy').map((w) => w.word)).toEqual(['MOON']);
  });
});

describe('generateRound', () => {
  it('builds a round of distinct words whose tiles are a true scramble', () => {
    const round = generateRound(POOL, seededRng(1), DEFAULT_SCRAMBLE_WORDS);
    expect(round).toHaveLength(DEFAULT_SCRAMBLE_WORDS);
    expect(new Set(round.map((w) => w.word)).size).toBe(DEFAULT_SCRAMBLE_WORDS);
    for (const w of round) {
      const letters = w.tiles.map((t) => t.letter);
      expect([...letters].sort()).toEqual(w.word.split('').sort());
      expect(letters.join('')).not.toBe(w.word);
      expect(new Set(w.tiles.map((t) => t.id)).size).toBe(w.word.length);
      expect(w.definition).toBe(`Definition of ${w.word}.`);
    }
  });

  it('clamps an out-of-range wordCount', () => {
    expect(generateRound(POOL, seededRng(2), 1)).toHaveLength(MIN_SCRAMBLE_WORDS);
    expect(generateRound(POOL, seededRng(3), 99)).toHaveLength(MAX_SCRAMBLE_WORDS);
  });

  it('avoids the previous round words when the pool allows it', () => {
    const exclude = new Set(WORDS.slice(0, 7));
    const round = generateRound(POOL, seededRng(4), MIN_SCRAMBLE_WORDS, exclude);
    expect(round.every((w) => !exclude.has(w.word))).toBe(true);
  });

  it('falls back to excluded words rather than failing a round', () => {
    const exclude = new Set(WORDS.slice(0, 10));
    const round = generateRound(POOL, seededRng(5), MAX_SCRAMBLE_WORDS, exclude);
    expect(round).toHaveLength(MAX_SCRAMBLE_WORDS);
    // Both non-excluded words are always taken first.
    expect(round.map((w) => w.word)).toEqual(expect.arrayContaining(['KOALA', 'LLAMA']));
  });

  it('throws an actionable error when the pool is too small', () => {
    expect(() => generateRound(POOL.slice(0, MIN_SCRAMBLE_WORDS - 1), seededRng(6))).toThrow(/Not enough words.*Add more/);
  });

  it('is deterministic for a seeded rng (the daily challenge relies on it)', () => {
    expect(generateRound(POOL, seededRng(7))).toEqual(generateRound(POOL, seededRng(7)));
  });
});

describe('answers', () => {
  // L-L-A-M-A scrambled as A L M A L: two identical As and Ls.
  const llama: ScrambleWord = {
    word: 'LLAMA',
    definition: '',
    tiles: [...'ALMAL'].map((letter, id) => ({ id, letter })),
  };

  it('spells from tile ids and grades by the spelled string, not by which duplicate tile', () => {
    expect(spell(llama.tiles, [1, 4])).toBe('LL');
    expect(isCorrect(llama, [1, 4, 0, 2, 3])).toBe(true);
    expect(isCorrect(llama, [4, 1, 3, 2, 0])).toBe(true);
    expect(isCorrect(llama, [0, 1, 4, 2, 3])).toBe(false);
  });

  it('correctPrefix gives the tile ids for the first n letters, without reusing a tile', () => {
    expect(correctPrefix(llama, 0)).toEqual([]);
    expect(correctPrefix(llama, 2)).toEqual([1, 4]);
    const full = correctPrefix(llama, llama.word.length);
    expect(new Set(full).size).toBe(llama.word.length);
    expect(isCorrect(llama, full)).toBe(true);
  });

  it('correctPrefix throws loudly on tiles that cannot spell the word', () => {
    const broken: ScrambleWord = { word: 'CAT', definition: '', tiles: [...'CAX'].map((letter, id) => ({ id, letter })) };
    expect(() => correctPrefix(broken, 3)).toThrow(/missing the letter "T"/);
  });
});
