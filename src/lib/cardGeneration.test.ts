import { describe, expect, it } from 'vitest';
import type { WordEntry } from '../types';
import { generateCard, markWord, selectWordPool, FREE_INDEX, TOTAL_CELLS, WORDS_NEEDED } from './cardGeneration';
import { seededRng } from '../test/rng';

function makeWords(count: number, difficulty: WordEntry['difficulty'] = 'easy'): WordEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `WORD${i}`,
    difficulty,
    definition: `Definition ${i}`,
  }));
}

describe('selectWordPool', () => {
  it('filters by difficulty for standard categories', () => {
    const words = [...makeWords(3, 'easy'), ...makeWords(2, 'hard')];
    expect(selectWordPool(words, 'animals', 'easy')).toHaveLength(3);
    expect(selectWordPool(words, 'animals', 'hard')).toHaveLength(2);
    expect(selectWordPool(words, 'animals', 'medium')).toHaveLength(0);
  });

  it('ignores difficulty for the freeplay category', () => {
    const words = [...makeWords(3, 'easy'), ...makeWords(2, 'hard')];
    expect(selectWordPool(words, 'freeplay', 'hard')).toHaveLength(5);
  });
});

describe('generateCard', () => {
  it('throws when the pool is smaller than a full card needs', () => {
    const words = makeWords(WORDS_NEEDED - 1);
    expect(() => generateCard(words)).toThrow(/Not enough words/);
  });

  it('builds a 25-cell card with a marked FREE center', () => {
    const words = makeWords(WORDS_NEEDED);
    const card = generateCard(words, seededRng(1));
    expect(card.cells).toHaveLength(TOTAL_CELLS);
    expect(card.cells[FREE_INDEX]).toEqual({ word: 'FREE', free: true, marked: true });
  });

  it('fills every non-FREE cell with a unique word drawn from the pool', () => {
    const words = makeWords(WORDS_NEEDED);
    const card = generateCard(words, seededRng(42));
    const nonFree = card.cells.filter((c) => !c.free);
    expect(nonFree).toHaveLength(WORDS_NEEDED);

    const seen = new Set(nonFree.map((c) => c.word));
    expect(seen.size).toBe(WORDS_NEEDED); // no duplicates
    for (const cell of nonFree) {
      expect(words.some((w) => w.word === cell.word)).toBe(true);
      expect(cell.marked).toBe(false);
    }
  });

  it('works with a larger pool by sampling a subset', () => {
    const words = makeWords(WORDS_NEEDED + 20);
    const card = generateCard(words, seededRng(7));
    expect(card.cells.filter((c) => !c.free)).toHaveLength(WORDS_NEEDED);
  });
});

describe('markWord', () => {
  it('marks only the cell with the matching word', () => {
    const words = makeWords(WORDS_NEEDED);
    const card = generateCard(words, seededRng(3));
    const target = card.cells.find((c) => !c.free)!.word;

    const marked = markWord(card, target);
    const markedCells = marked.cells.filter((c) => c.marked && !c.free);
    expect(markedCells).toHaveLength(1);
    expect(markedCells[0].word).toBe(target);
  });
});
