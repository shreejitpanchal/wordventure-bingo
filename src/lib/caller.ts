import type { BingoCard, Clue, Difficulty, WordEntry } from '../types';
import { getClue } from './clueMatching';

/** Milliseconds between auto-caller clues, tuned to the age/difficulty tiers. */
export const CALL_PACE_MS: Record<Difficulty, number> = {
  easy: 7000,
  medium: 5500,
  hard: 4000,
};

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * The call pool is every non-FREE word appearing on any card in play, not
 * the whole word bank -- calling a word nobody has would waste a turn for
 * no reason.
 */
export function buildCallQueue(cards: BingoCard[], rng: () => number = Math.random): string[] {
  const words = new Set<string>();
  for (const card of cards) {
    for (const cell of card.cells) {
      if (!cell.free) words.add(cell.word);
    }
  }
  return shuffle(Array.from(words), rng);
}

export function clueForWord(
  word: string,
  wordEntries: WordEntry[],
  difficulty: Difficulty,
  rng: () => number = Math.random,
): Clue {
  const entry = wordEntries.find((w) => w.word === word);
  if (!entry) {
    // A word came from a generated card, which is itself built from
    // wordEntries -- this can only happen if the pool passed in doesn't
    // match the one the card was generated from.
    throw new Error(`No word-bank entry found for "${word}"`);
  }
  return getClue(entry, difficulty, rng);
}
