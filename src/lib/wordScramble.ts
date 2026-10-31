import type { CategoryId, Difficulty, WordEntry } from '../types';
import { selectWordPool } from './cardGeneration';
import { makeAnagram } from './clueMatching';
import { shuffle } from './random';

export const WORD_COUNT_OPTIONS = [5, 8, 10] as const;
export const MIN_SCRAMBLE_WORDS = WORD_COUNT_OPTIONS[0];
export const MAX_SCRAMBLE_WORDS = WORD_COUNT_OPTIONS[WORD_COUNT_OPTIONS.length - 1];
export const DEFAULT_SCRAMBLE_WORDS = 5;

// Like Wordscapes, a length cap layered on top of the vocabulary tier: the
// tiles sit in one wrapping row, and a 13-letter scramble is a wall of
// letters, not a puzzle. 3 letters is the floor -- a 2-letter "scramble"
// has only one other order. Medium/hard are looser than Wordscapes' caps
// because the animals/geography/science medium/hard tiers hold only 24
// words each; tighter caps left as few as 14 to draw from.
const MIN_LENGTH = 3;
const MAX_LENGTH: Record<Difficulty, number> = { easy: 6, medium: 10, hard: 12 };

/** A tappable letter tile. Duplicate letters get separate ids. */
export interface ScrambleTile {
  id: number;
  letter: string;
}

export interface ScrambleWord {
  word: string;
  definition: string;
  /** In scrambled order -- never spells `word` itself (for length > 2). */
  tiles: ScrambleTile[];
}

/** Category/difficulty filter plus the length cap. Also drops anything
 * that isn't plain A-Z: the parent-edited Free Play list can hold spaces,
 * hyphens or digits, which can't be tiles. */
export function selectScramblePool(words: WordEntry[], category: CategoryId, difficulty: Difficulty): WordEntry[] {
  return selectWordPool(words, category, difficulty).filter(
    (w) => /^[A-Z]+$/.test(w.word) && w.word.length >= MIN_LENGTH && w.word.length <= MAX_LENGTH[difficulty],
  );
}

/**
 * Builds one round of `wordCount` distinct words, each with its scrambled
 * tiles. Prefers words not in `excludeWords` (the previous round's, same
 * mechanism as Synonym Safari's generateRound) and only falls back to them
 * if the pool can't fill a round otherwise. Throws loudly if it still can't.
 */
export function generateRound(
  pool: WordEntry[],
  rng: () => number = Math.random,
  wordCount: number = DEFAULT_SCRAMBLE_WORDS,
  excludeWords: ReadonlySet<string> = new Set(),
): ScrambleWord[] {
  const target = Math.max(MIN_SCRAMBLE_WORDS, Math.min(MAX_SCRAMBLE_WORDS, wordCount));
  const shuffled = shuffle(pool, rng);
  const picked: WordEntry[] = [];
  const used = new Set<string>();

  function tryAdd(entry: WordEntry): void {
    if (picked.length >= target || used.has(entry.word)) return;
    picked.push(entry);
    used.add(entry.word);
  }

  for (const entry of shuffled) if (!excludeWords.has(entry.word)) tryAdd(entry);
  for (const entry of shuffled) tryAdd(entry);

  if (picked.length < target) {
    throw new Error(
      `Not enough words to build a Word Scramble round: need ${target}, found ${picked.length} usable ` +
        `(pool had ${pool.length}). Add more ${MIN_LENGTH}+ letter words to this category/difficulty.`,
    );
  }

  return picked.map((entry) => ({
    word: entry.word,
    definition: entry.definition,
    tiles: makeAnagram(entry.word, rng)
      .split('')
      .map((letter, id) => ({ id, letter })),
  }));
}

/** Spells the answer from the tile ids placed so far. */
export function spell(tiles: ScrambleTile[], answer: readonly number[]): string {
  return answer.map((id) => tiles.find((t) => t.id === id)?.letter ?? '').join('');
}

/** Graded by the spelled string, not tile ids, so swapping two identical
 * letters (the two Ls in BALLOON) still counts as correct. */
export function isCorrect(item: ScrambleWord, answer: readonly number[]): boolean {
  return spell(item.tiles, answer) === item.word;
}

/**
 * Tile ids spelling the first `count` letters of the word, for the hint
 * (count = locked letters + 1) and for revealing a skipped word (count =
 * full length). Picks the lowest unused tile id per letter so the result
 * is deterministic.
 */
export function correctPrefix(item: ScrambleWord, count: number): number[] {
  const used = new Set<number>();
  const ids: number[] = [];
  for (const letter of item.word.slice(0, count)) {
    const tile = item.tiles.find((t) => t.letter === letter && !used.has(t.id));
    if (!tile) throw new Error(`Tiles for "${item.word}" are missing the letter "${letter}" -- generateRound bug.`);
    used.add(tile.id);
    ids.push(tile.id);
  }
  return ids;
}
