export type Difficulty = 'easy' | 'medium' | 'hard';

export type CategoryId = 'spelling' | 'animals' | 'geography' | 'science' | 'freeplay';

export type ClueType = 'definition' | 'synonym' | 'fillBlank' | 'riddle' | 'anagram';

export interface WordEntry {
  word: string;
  difficulty: Difficulty;
  definition: string;
  synonym?: string;
  fillBlank?: string;
  riddle?: string;
}

export interface WordBank {
  category: CategoryId;
  label: string;
  words: WordEntry[];
}

export interface Clue {
  type: ClueType;
  text: string;
  word: string;
}

/** 5x5 grid, row-major. The center cell (index 12) is always the FREE space. */
export interface BingoCard {
  cells: CardCell[];
}

export interface CardCell {
  word: string;
  free: boolean;
  marked: boolean;
}

export type WinPattern = 'row' | 'column' | 'diagonal' | 'corners' | 'blackout';

export interface WinResult {
  won: boolean;
  patterns: WinPattern[];
  /** Cell indices (0-24) that make up the winning pattern(s), for highlighting. */
  cellIndices: number[];
}

export type ScreenName = 'menu' | 'game' | 'win' | 'settings' | 'wordscapes-game' | 'wordscapes-win';

export type GameMode = 'bingo' | 'wordscapes';

export interface Settings {
  soundEnabled: boolean;
  reduceMotion: boolean;
}

export interface Streaks {
  /** Total games played per category. */
  gamesPlayed: Record<string, number>;
  /** Total wins per category. */
  wins: Record<string, number>;
  /** Current consecutive-win streak per category. */
  currentStreak: Record<string, number>;
  /** Best consecutive-win streak per category, ever. */
  bestStreak: Record<string, number>;
}

export interface GameConfig {
  category: CategoryId;
  difficulty: Difficulty;
  /** Pass-and-play: 1 = solo vs. computer caller, 2 = two players share one device. */
  players: 1 | 2;
  /** Seconds between auto-caller clues -- a menu setting, independent of difficulty. */
  callSeconds: number;
}

// --- Wordscapes (word-connect crossword mode) ---------------------------

export interface WordscapesConfig {
  category: CategoryId;
  difficulty: Difficulty;
  /** How many words the generated puzzle should target (3-10). */
  wordCount: number;
}

export type GridDirection = 'across' | 'down';

/** A word's placement on the crossword grid. */
export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: GridDirection;
}

export interface GridCellData {
  letter: string;
  revealed: boolean;
}

export interface WordscapesGrid {
  placedWords: PlacedWord[];
  /** Sparse, keyed by `"row,col"`, cropped so the used area starts at (0,0). */
  cells: Map<string, GridCellData>;
  rows: number;
  cols: number;
}

/** One drag-able letter tile on the wheel. Duplicate letters get separate
 * tile ids (e.g. a level needing two Ls gets two distinct L tiles). */
export interface WheelTile {
  id: number;
  letter: string;
}

export interface WordscapesLevel {
  grid: WordscapesGrid;
  wheel: WheelTile[];
  /** Extra words spellable from the wheel that aren't in the grid -- optional, for bonus points. */
  bonusWords: string[];
}

export interface WordscapesStats {
  puzzlesCompleted: Record<string, number>;
  bonusWordsFound: Record<string, number>;
}
