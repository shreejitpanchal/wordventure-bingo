import type {
  CategoryId,
  Difficulty,
  GridCellData,
  GridDirection,
  PlacedWord,
  WheelTile,
  WordEntry,
  WordscapesGrid,
  WordscapesLevel,
} from '../../types';
import { selectWordPool } from '../cardGeneration';
import { shuffle } from '../random';

export const MIN_WORD_COUNT = 3;
export const MAX_WORD_COUNT = 10;
export const DEFAULT_WORD_COUNT = 6;

const MIN_WORD_LENGTH = 3;
const MIN_GRID_WORDS = 3;
const SAMPLE_SIZE = 20; // words attempted per generation try; not all will fit
const MAX_GENERATION_ATTEMPTS = 12;
const MAX_BONUS_WORDS = 12;

/**
 * Wordscapes' own difficulty axis is puzzle complexity (word/tile count),
 * separate from Bingo's vocabulary-difficulty tagging on the same word
 * banks -- an "easy" Bingo word like ELEPHANT is easy to *read*, not short.
 * This caps word length on top of the existing category/difficulty filter
 * so easy puzzles stay short and the wheel stays small and readable.
 */
const MAX_WORD_LENGTH: Record<Difficulty, number> = {
  easy: 5,
  medium: 8,
  hard: Infinity,
};

/** Category/difficulty pool, further capped by word length for Wordscapes. */
export function selectWordscapesPool(words: WordEntry[], category: CategoryId, difficulty: Difficulty): WordEntry[] {
  return selectWordPool(words, category, difficulty).filter((w) => w.word.length <= MAX_WORD_LENGTH[difficulty]);
}

type SparseGrid = Map<string, string>; // "row,col" -> letter
const cellKey = (row: number, col: number) => `${row},${col}`;

function candidatePlacements(grid: SparseGrid, word: string, rng: () => number) {
  const candidates: { row: number; col: number; direction: GridDirection }[] = [];
  for (let i = 0; i < word.length; i++) {
    const letter = word[i];
    for (const [key, existingLetter] of grid.entries()) {
      if (existingLetter !== letter) continue;
      const [r, c] = key.split(',').map(Number);
      candidates.push({ row: r - i, col: c, direction: 'down' });
      candidates.push({ row: r, col: c - i, direction: 'across' });
    }
  }
  return shuffle(candidates, rng);
}

/**
 * A placement is valid only if it crosses at least one existing word (the
 * very first word placed is the only exception, handled separately), every
 * overlapping cell agrees letter-for-letter, and the word doesn't run flush
 * alongside another word (checked via the perpendicular neighbor cells) --
 * without that check two unrelated words could visually fuse into what
 * looks like one long word.
 */
function canPlace(grid: SparseGrid, word: string, row: number, col: number, direction: GridDirection): boolean {
  let intersects = false;
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    const existing = grid.get(cellKey(r, c));
    if (existing) {
      if (existing !== word[i]) return false;
      intersects = true;
    } else {
      const neighbors: [number, number][] =
        direction === 'across'
          ? [
              [r - 1, c],
              [r + 1, c],
            ]
          : [
              [r, c - 1],
              [r, c + 1],
            ];
      if (neighbors.some(([nr, nc]) => grid.has(cellKey(nr, nc)))) return false;
    }
  }
  if (!intersects) return false;

  const beforeR = direction === 'down' ? row - 1 : row;
  const beforeC = direction === 'across' ? col - 1 : col;
  const afterR = direction === 'down' ? row + word.length : row;
  const afterC = direction === 'across' ? col + word.length : col;
  if (grid.has(cellKey(beforeR, beforeC))) return false;
  if (grid.has(cellKey(afterR, afterC))) return false;

  return true;
}

function placeWord(grid: SparseGrid, word: string, row: number, col: number, direction: GridDirection): void {
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    grid.set(cellKey(r, c), word[i]);
  }
}

function tryFitWords(words: string[], rng: () => number): PlacedWord[] {
  const grid: SparseGrid = new Map();
  const placed: PlacedWord[] = [];

  words.forEach((word, index) => {
    if (index === 0) {
      placeWord(grid, word, 0, 0, 'across');
      placed.push({ word, row: 0, col: 0, direction: 'across' });
      return;
    }
    for (const { row, col, direction } of candidatePlacements(grid, word, rng)) {
      if (canPlace(grid, word, row, col, direction)) {
        placeWord(grid, word, row, col, direction);
        placed.push({ word, row, col, direction });
        return;
      }
    }
    // Doesn't fit geometrically -- it may still surface later as a bonus word.
  });

  return placed;
}

/** Crops the sparse grid to a tight bounding box so rendering has no dead space. */
function buildGrid(placedWords: PlacedWord[]): WordscapesGrid {
  const rows = placedWords.flatMap((p) =>
    Array.from({ length: p.word.length }, (_, i) => (p.direction === 'down' ? p.row + i : p.row)),
  );
  const cols = placedWords.flatMap((p) =>
    Array.from({ length: p.word.length }, (_, i) => (p.direction === 'across' ? p.col + i : p.col)),
  );
  const minRow = Math.min(...rows);
  const minCol = Math.min(...cols);
  const maxRow = Math.max(...rows);
  const maxCol = Math.max(...cols);

  const cells = new Map<string, GridCellData>();
  const cropped: PlacedWord[] = placedWords.map((p) => ({ ...p, row: p.row - minRow, col: p.col - minCol }));
  for (const p of cropped) {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.direction === 'down' ? p.row + i : p.row;
      const c = p.direction === 'across' ? p.col + i : p.col;
      cells.set(cellKey(r, c), { letter: p.word[i], revealed: false });
    }
  }

  return { placedWords: cropped, cells, rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 };
}

function letterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

/** Wheel tiles: one physical tile per letter, sized to the MOST copies any
 * single placed word needs of that letter -- tiles are reused across words
 * by tracing them again, not consumed, so this isn't a sum across words. */
function buildWheel(placedWords: string[], rng: () => number): WheelTile[] {
  const maxCounts = new Map<string, number>();
  for (const word of placedWords) {
    for (const [letter, count] of letterCounts(word)) {
      maxCounts.set(letter, Math.max(maxCounts.get(letter) ?? 0, count));
    }
  }
  const tiles: WheelTile[] = [];
  let id = 0;
  for (const [letter, count] of maxCounts) {
    for (let i = 0; i < count; i++) tiles.push({ id: id++, letter });
  }
  return shuffle(tiles, rng);
}

function isSpellableFromWheel(word: string, wheelCounts: Map<string, number>): boolean {
  for (const [letter, needed] of letterCounts(word)) {
    if ((wheelCounts.get(letter) ?? 0) < needed) return false;
  }
  return true;
}

function findBonusWords(pool: WordEntry[], gridWords: Set<string>, wheel: WheelTile[]): string[] {
  const wheelCounts = letterCounts(wheel.map((t) => t.letter).join(''));
  const bonus: string[] = [];
  for (const entry of pool) {
    if (bonus.length >= MAX_BONUS_WORDS) break;
    const word = entry.word;
    if (word.length < MIN_WORD_LENGTH || gridWords.has(word)) continue;
    if (isSpellableFromWheel(word, wheelCounts)) bonus.push(word);
  }
  return bonus;
}

/**
 * Reveals one random letter of every placed word as a free hint -- without
 * this a fresh puzzle gives no indication at all of where any word begins.
 * Always picking index 0 (the first letter) made every puzzle predictable
 * in the same way, AND made longer words disproportionately likely to show
 * a *second* revealed letter: the crossword-fit algorithm sometimes places
 * a later word so its own index-0 lands exactly on an intersection with an
 * earlier word, stacking two "always reveal index 0" hints onto one word
 * purely by coincidence.
 *
 * Fixed by: (a) picking a random index per word instead of always 0; (b)
 * preferring one of the word's own exclusive cells (not shared with any
 * other word) for that index, so revealing it can never also hand a "free"
 * hint to whatever crosses it -- only falling back to any index if the
 * word happens to be made entirely of intersections; (c) skipping a word
 * that already has a revealed cell (inherited from an intersecting word's
 * reveal) rather than adding a redundant second one. Every word ends up
 * with at least one visible letter; a second, coincidental one is now rare
 * rather than systematic.
 */
function revealHintLetters(grid: WordscapesGrid, rng: () => number): WordscapesGrid {
  const cells = new Map(grid.cells);

  const occupancy = new Map<string, number>();
  for (const p of grid.placedWords) {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.direction === 'down' ? p.row + i : p.row;
      const c = p.direction === 'across' ? p.col + i : p.col;
      const key = cellKey(r, c);
      occupancy.set(key, (occupancy.get(key) ?? 0) + 1);
    }
  }

  for (const p of grid.placedWords) {
    const cellKeysInWord = Array.from({ length: p.word.length }, (_, i) => {
      const r = p.direction === 'down' ? p.row + i : p.row;
      const c = p.direction === 'across' ? p.col + i : p.col;
      return cellKey(r, c);
    });
    if (cellKeysInWord.some((key) => cells.get(key)?.revealed)) continue;

    const exclusiveIndices = cellKeysInWord
      .map((key, i) => ((occupancy.get(key) ?? 1) === 1 ? i : -1))
      .filter((i) => i >= 0);
    const candidates = exclusiveIndices.length > 0 ? exclusiveIndices : cellKeysInWord.map((_, i) => i);
    const revealIndex = candidates[Math.floor(rng() * candidates.length)];

    const key = cellKeysInWord[revealIndex];
    const existing = cells.get(key);
    if (existing) cells.set(key, { ...existing, revealed: true });
  }
  return { ...grid, cells };
}

/**
 * Draws a sample spread across as many different word lengths as the pool
 * has, instead of a plain random slice -- a pool that happens to be
 * dominated by one length (e.g. mostly 5-letter words) would otherwise
 * produce a sample of near-identical lengths almost every time, and a
 * puzzle where every word is the same length reads as monotonous/buggy.
 * Round-robins one word per length per round (each length's own words
 * pre-shuffled), so the sample is as length-diverse as the pool allows.
 */
function stratifiedSample(eligible: WordEntry[], rng: () => number, sampleSize: number): WordEntry[] {
  const byLength = new Map<number, WordEntry[]>();
  for (const entry of eligible) {
    const bucket = byLength.get(entry.word.length);
    if (bucket) bucket.push(entry);
    else byLength.set(entry.word.length, [entry]);
  }
  const lengths = shuffle(Array.from(byLength.keys()), rng);
  for (const len of lengths) byLength.set(len, shuffle(byLength.get(len)!, rng));

  const sample: WordEntry[] = [];
  for (let round = 0; sample.length < sampleSize; round++) {
    let addedAny = false;
    for (const len of lengths) {
      const bucket = byLength.get(len)!;
      if (round < bucket.length) {
        sample.push(bucket[round]);
        addedAny = true;
        if (sample.length >= sampleSize) break;
      }
    }
    if (!addedAny) break; // every length bucket exhausted
  }
  return sample;
}

/**
 * Builds one procedurally-generated puzzle from a category/difficulty word
 * pool, targeting `wordCount` grid words (clamped to [MIN_WORD_COUNT,
 * MAX_WORD_COUNT]; the menu only offers values already in range). Throws if
 * no valid puzzle could be assembled after several attempts -- a shipped
 * word bank too sparse to ever interlock is a data bug, not a state to
 * silently render around.
 */
export function generateLevel(
  pool: WordEntry[],
  rng: () => number = Math.random,
  wordCount: number = DEFAULT_WORD_COUNT,
): WordscapesLevel {
  const targetWords = Math.max(MIN_WORD_COUNT, Math.min(MAX_WORD_COUNT, wordCount));
  const eligible = pool.filter((w) => w.word.length >= MIN_WORD_LENGTH);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    // Only the anchor (the unconditional first placement) is chosen for
    // length -- the longest word available makes the strongest foundation
    // for later words to cross. Everything after it stays in the sample's
    // length-interleaved order rather than being sorted purely by length:
    // a strict longest-first sort exhausts one length group before ever
    // attempting a shorter word, so a small wordCount would only ever grab
    // that one cluster -- monotonous even with a length-diverse sample.
    const raw = stratifiedSample(eligible, rng, SAMPLE_SIZE);
    if (raw.length === 0) continue; // nothing eligible at all -- keep looping to the loud failure below

    let longestIdx = 0;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].word.length > raw[longestIdx].word.length) longestIdx = i;
    }
    const sample = [raw[longestIdx], ...raw.slice(0, longestIdx), ...raw.slice(longestIdx + 1)].map((w) => w.word);

    const placed = tryFitWords(sample, rng).slice(0, targetWords);
    if (placed.length < MIN_GRID_WORDS) continue;

    const grid = revealHintLetters(buildGrid(placed), rng);
    const wheel = buildWheel(placed.map((p) => p.word), rng);
    const gridWordSet = new Set(placed.map((p) => p.word));
    const bonusWords = findBonusWords(eligible, gridWordSet, wheel);

    return { grid, wheel, bonusWords };
  }

  throw new Error(
    `Could not generate a Wordscapes puzzle from this word pool (${eligible.length} eligible words) after ${MAX_GENERATION_ATTEMPTS} attempts. The category/difficulty may need more overlapping-letter words.`,
  );
}

/** Reveals every cell belonging to `word` once the player spells it correctly. */
export function revealWord(grid: WordscapesGrid, word: string): WordscapesGrid {
  const placed = grid.placedWords.find((p) => p.word === word);
  if (!placed) return grid;

  const cells = new Map(grid.cells);
  for (let i = 0; i < placed.word.length; i++) {
    const r = placed.direction === 'down' ? placed.row + i : placed.row;
    const c = placed.direction === 'across' ? placed.col + i : placed.col;
    const key = cellKey(r, c);
    const existing = cells.get(key);
    if (existing) cells.set(key, { ...existing, revealed: true });
  }
  return { ...grid, cells };
}

/** Reveals every cell in the grid at once -- the "give up, show me" escape hatch. */
export function revealAll(grid: WordscapesGrid): WordscapesGrid {
  const cells = new Map(grid.cells);
  for (const [key, cell] of cells) {
    if (!cell.revealed) cells.set(key, { ...cell, revealed: true });
  }
  return { ...grid, cells };
}

/**
 * Reveals one random currently-unrevealed cell anywhere in the grid -- the
 * repeatable "hint" button, as opposed to `revealAll`'s one-shot "give up."
 * Calling it repeatedly reveals another random letter each time until
 * nothing is left unrevealed, at which point it's a safe no-op (matches
 * `revealWord`/`revealAll`'s pattern of never erroring on an already-done
 * grid).
 */
export function revealRandomLetter(grid: WordscapesGrid, rng: () => number = Math.random): WordscapesGrid {
  const unrevealedKeys = Array.from(grid.cells.entries())
    .filter(([, cell]) => !cell.revealed)
    .map(([key]) => key);
  if (unrevealedKeys.length === 0) return grid;

  const key = unrevealedKeys[Math.floor(rng() * unrevealedKeys.length)];
  const cells = new Map(grid.cells);
  cells.set(key, { ...cells.get(key)!, revealed: true });
  return { ...grid, cells };
}

export function isLevelComplete(grid: WordscapesGrid): boolean {
  return Array.from(grid.cells.values()).every((cell) => cell.revealed);
}

export function isWordFound(grid: WordscapesGrid, word: string): boolean {
  const placed = grid.placedWords.find((p) => p.word === word);
  if (!placed) return false;
  for (let i = 0; i < placed.word.length; i++) {
    const r = placed.direction === 'down' ? placed.row + i : placed.row;
    const c = placed.direction === 'across' ? placed.col + i : placed.col;
    if (!grid.cells.get(cellKey(r, c))?.revealed) return false;
  }
  return true;
}
