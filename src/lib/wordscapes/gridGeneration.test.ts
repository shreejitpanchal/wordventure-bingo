import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORD_COUNT,
  generateLevel,
  isLevelComplete,
  isWordFound,
  revealAll,
  revealRandomLetter,
  revealWord,
  selectWordscapesPool,
} from './gridGeneration';
import { WORD_BANKS } from '../../data/wordBanks';
import { seededRng } from '../../test/rng';
import type { WordEntry } from '../../types';

function lettersOf(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

function isSpellableFrom(word: string, wheelLetters: string[]): boolean {
  const wheelCounts = lettersOf(wheelLetters.join(''));
  for (const [letter, needed] of lettersOf(word)) {
    if ((wheelCounts.get(letter) ?? 0) < needed) return false;
  }
  return true;
}

const animalsEasy: WordEntry[] = WORD_BANKS.animals.words.filter((w) => w.difficulty === 'easy');
const scienceHard: WordEntry[] = WORD_BANKS.science.words.filter((w) => w.difficulty === 'hard');

describe('generateLevel', () => {
  it('produces a grid where every placed word reads correctly cell-by-cell, with a hint letter revealed for every word', () => {
    const level = generateLevel(animalsEasy, seededRng(1));

    expect(level.grid.placedWords.length).toBeGreaterThanOrEqual(3);

    for (const placed of level.grid.placedWords) {
      const cellsInWord = Array.from({ length: placed.word.length }, (_, i) => {
        const row = placed.direction === 'down' ? placed.row + i : placed.row;
        const col = placed.direction === 'across' ? placed.col + i : placed.col;
        return level.grid.cells.get(`${row},${col}`);
      });

      cellsInWord.forEach((cell, i) => {
        expect(cell).toBeDefined();
        expect(cell!.letter).toBe(placed.word[i]);
      });
      // Every word has at least one revealed hint letter -- not necessarily
      // its own first letter, and inherited from an intersecting word's
      // reveal is fine too (see revealHintLetters).
      expect(cellsInWord.some((cell) => cell!.revealed)).toBe(true);
    }
    // The free hint letters alone never solve the puzzle.
    expect(isLevelComplete(level.grid)).toBe(false);
  });

  it('does not always reveal the first letter of every word', () => {
    // Across many seeds, at least one puzzle should have a word whose start
    // cell isn't the revealed one -- guards against regressing to always
    // revealing index 0.
    let sawNonStartReveal = false;
    for (let seed = 100; seed < 130 && !sawNonStartReveal; seed++) {
      const level = generateLevel(animalsEasy, seededRng(seed));
      for (const placed of level.grid.placedWords) {
        if (!level.grid.cells.get(`${placed.row},${placed.col}`)?.revealed) {
          sawNonStartReveal = true;
          break;
        }
      }
    }
    expect(sawNonStartReveal).toBe(true);
  });

  it('does not systematically double-reveal longer words (regression for the old always-index-0 bug)', () => {
    // The old bug always revealed index 0, which made a 5+ letter word
    // disproportionately likely to *always* show a second, coincidental
    // reveal from an intersecting word's own index-0 landing on it. Across
    // many seeds, at least one 5+ letter word should show exactly the one
    // guaranteed hint letter, not two.
    let sawSingleRevealOnLongWord = false;
    for (let seed = 200; seed < 230 && !sawSingleRevealOnLongWord; seed++) {
      const level = generateLevel(animalsEasy, seededRng(seed));
      for (const placed of level.grid.placedWords) {
        if (placed.word.length < 5) continue;
        let revealedCount = 0;
        for (let i = 0; i < placed.word.length; i++) {
          const row = placed.direction === 'down' ? placed.row + i : placed.row;
          const col = placed.direction === 'across' ? placed.col + i : placed.col;
          if (level.grid.cells.get(`${row},${col}`)?.revealed) revealedCount++;
        }
        if (revealedCount === 1) {
          sawSingleRevealOnLongWord = true;
          break;
        }
      }
    }
    expect(sawSingleRevealOnLongWord).toBe(true);
  });

  it('crops the grid so the used area starts at row 0 and col 0', () => {
    const level = generateLevel(animalsEasy, seededRng(2));
    const rows = Array.from(level.grid.cells.keys()).map((k) => Number(k.split(',')[0]));
    const cols = Array.from(level.grid.cells.keys()).map((k) => Number(k.split(',')[1]));
    expect(Math.min(...rows)).toBe(0);
    expect(Math.min(...cols)).toBe(0);
    expect(Math.max(...rows)).toBe(level.grid.rows - 1);
    expect(Math.max(...cols)).toBe(level.grid.cols - 1);
  });

  it('builds a wheel that can spell every placed grid word', () => {
    const level = generateLevel(scienceHard, seededRng(3));
    const wheelLetters = level.wheel.map((t) => t.letter);
    for (const placed of level.grid.placedWords) {
      expect(isSpellableFrom(placed.word, wheelLetters)).toBe(true);
    }
  });

  it('only offers bonus words that are spellable from the wheel and not already in the grid', () => {
    const level = generateLevel(animalsEasy, seededRng(4));
    const wheelLetters = level.wheel.map((t) => t.letter);
    const gridWords = new Set(level.grid.placedWords.map((p) => p.word));
    for (const bonus of level.bonusWords) {
      expect(gridWords.has(bonus)).toBe(false);
      expect(isSpellableFrom(bonus, wheelLetters)).toBe(true);
    }
  });

  it('reveals only the target word\'s cells and leaves shared-intersection cells revealed for both crossing words', () => {
    const level = generateLevel(animalsEasy, seededRng(6));
    expect(isLevelComplete(level.grid)).toBe(false);

    let grid = level.grid;
    for (const placed of grid.placedWords) {
      expect(isWordFound(grid, placed.word)).toBe(false);
      grid = revealWord(grid, placed.word);
      expect(isWordFound(grid, placed.word)).toBe(true);
    }
    expect(isLevelComplete(grid)).toBe(true);
  });

  it('revealWord is a no-op for a word that was never placed', () => {
    const level = generateLevel(animalsEasy, seededRng(7));
    const result = revealWord(level.grid, 'NOTPLACEDWORD');
    expect(result).toBe(level.grid);
  });

  it('revealAll reveals every cell in one step, regardless of prior progress', () => {
    const level = generateLevel(animalsEasy, seededRng(9));
    expect(isLevelComplete(level.grid)).toBe(false);

    const solved = revealAll(level.grid);
    expect(isLevelComplete(solved)).toBe(true);
    for (const placed of solved.placedWords) {
      expect(isWordFound(solved, placed.word)).toBe(true);
    }
  });

  it('revealRandomLetter reveals exactly one previously-unrevealed cell per call', () => {
    const level = generateLevel(animalsEasy, seededRng(10));
    let grid = level.grid;
    const totalCells = grid.cells.size;

    let revealedCount = Array.from(grid.cells.values()).filter((c) => c.revealed).length;
    while (revealedCount < totalCells) {
      const next = revealRandomLetter(grid, seededRng(revealedCount));
      const nextRevealedCount = Array.from(next.cells.values()).filter((c) => c.revealed).length;
      expect(nextRevealedCount).toBe(revealedCount + 1);
      grid = next;
      revealedCount = nextRevealedCount;
    }
    expect(isLevelComplete(grid)).toBe(true);
  });

  it('revealRandomLetter is a no-op once the grid is already fully revealed', () => {
    const level = generateLevel(animalsEasy, seededRng(11));
    const solved = revealAll(level.grid);
    const result = revealRandomLetter(solved, seededRng(1));
    expect(result).toBe(solved);
  });

  it('throws when the pool is too sparse to interlock at all', () => {
    const disjoint: WordEntry[] = [
      { word: 'ZQX', difficulty: 'easy', definition: 'n/a' },
      { word: 'FJW', difficulty: 'easy', definition: 'n/a' },
    ];
    expect(() => generateLevel(disjoint, seededRng(5))).toThrow(/Could not generate/);
  });

  it('produces length-diverse puzzles rather than clustering on one word length', () => {
    const level = generateLevel(animalsEasy, seededRng(8), 6);
    const lengths = new Set(level.grid.placedWords.map((p) => p.word.length));
    expect(lengths.size).toBeGreaterThan(1);
  });

  it('never places more words than the requested wordCount', () => {
    for (const wordCount of [3, 5, 10]) {
      const level = generateLevel(animalsEasy, seededRng(wordCount), wordCount);
      expect(level.grid.placedWords.length).toBeLessThanOrEqual(wordCount);
      expect(level.grid.placedWords.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('prefers not placing excludeWords when the pool has enough other words', () => {
    // spelling's easy tier is large enough that excluding a handful of its
    // own words still leaves plenty to interlock a puzzle from.
    const pool = WORD_BANKS.spelling.words.filter((w) => w.difficulty === 'easy');
    const previous = generateLevel(pool, seededRng(42));
    const excludeWords = new Set(previous.grid.placedWords.map((p) => p.word));
    const next = generateLevel(pool, seededRng(43), DEFAULT_WORD_COUNT, excludeWords);
    const overlap = next.grid.placedWords.filter((p) => excludeWords.has(p.word));
    expect(overlap).toHaveLength(0);
  });

  it('still generates a puzzle when excludeWords would leave too little to sample from', () => {
    const excludeWords = new Set(animalsEasy.map((w) => w.word));
    expect(() => generateLevel(animalsEasy, seededRng(44), DEFAULT_WORD_COUNT, excludeWords)).not.toThrow();
  });
});

describe('selectWordscapesPool', () => {
  it('caps easy words at 5 letters even though the same word bank tier has longer Bingo-easy words', () => {
    const pool = selectWordscapesPool(WORD_BANKS.animals.words, 'animals', 'easy');
    expect(pool.length).toBeGreaterThan(0);
    for (const entry of pool) {
      expect(entry.word.length).toBeLessThanOrEqual(5);
      expect(entry.difficulty).toBe('easy');
    }
    // ELEPHANT is easy Bingo vocabulary but 8 letters -- must be excluded here.
    expect(pool.some((w) => w.word === 'ELEPHANT')).toBe(false);
  });

  it('caps medium words at 8 letters and hard words unbounded', () => {
    const medium = selectWordscapesPool(WORD_BANKS.science.words, 'science', 'medium');
    for (const entry of medium) expect(entry.word.length).toBeLessThanOrEqual(8);

    const hard = selectWordscapesPool(WORD_BANKS.science.words, 'science', 'hard');
    expect(hard.some((w) => w.word.length > 8)).toBe(true);
  });
});
