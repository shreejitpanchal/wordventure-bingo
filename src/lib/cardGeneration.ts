import type { BingoCard, CardCell, Difficulty, WordEntry } from '../types';

export const CARD_SIZE = 5;
export const TOTAL_CELLS = CARD_SIZE * CARD_SIZE;
export const FREE_INDEX = 12; // center of a 5x5 grid
export const WORDS_NEEDED = TOTAL_CELLS - 1; // every cell except FREE

/**
 * Free Play has no real difficulty tiers (it's a single parent-edited list),
 * so it ignores the difficulty filter and uses every word in the bank.
 */
export function selectWordPool(words: WordEntry[], category: string, difficulty: Difficulty): WordEntry[] {
  if (category === 'freeplay') return words;
  return words.filter((w) => w.difficulty === difficulty);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Builds one 5x5 card. Throws if the pool can't fill a card -- a shipped
 * word bank running short is a data bug, not a state to render around.
 */
export function generateCard(pool: WordEntry[], rng: () => number = Math.random): BingoCard {
  if (pool.length < WORDS_NEEDED) {
    throw new Error(
      `Not enough words to build a card: need ${WORDS_NEEDED}, got ${pool.length}. Add more words to this category/difficulty.`,
    );
  }

  const picked = shuffle(pool, rng).slice(0, WORDS_NEEDED);
  const cells: CardCell[] = [];
  let picker = 0;
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (i === FREE_INDEX) {
      cells.push({ word: 'FREE', free: true, marked: true });
    } else {
      cells.push({ word: picked[picker++].word, free: false, marked: false });
    }
  }
  return { cells };
}

export function markWord(card: BingoCard, word: string): BingoCard {
  return {
    cells: card.cells.map((cell) => (cell.word === word ? { ...cell, marked: true } : cell)),
  };
}
