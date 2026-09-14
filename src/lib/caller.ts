import type { BingoCard, Clue, Difficulty, WordEntry } from '../types';
import { getClue } from './clueMatching';
import { shuffle } from './random';

/**
 * Auto-caller pace is a separate, explicit menu setting (seconds between
 * clues), not derived from difficulty -- an earlier version tied pace to
 * difficulty (4-7s), which read as "too fast" regardless of vocabulary
 * level for a kid still reading the clue and scanning a 5x5 card. Letting
 * players pick their own pace decouples "how hard the words are" from
 * "how much time I get," the same way Wordscapes' word-length cap and
 * word-count setting are independent knobs.
 */
export const CALL_SECONDS_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
export const MIN_CALL_SECONDS = CALL_SECONDS_OPTIONS[0];
export const MAX_CALL_SECONDS = CALL_SECONDS_OPTIONS[CALL_SECONDS_OPTIONS.length - 1];
export const DEFAULT_CALL_SECONDS = 20;

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
