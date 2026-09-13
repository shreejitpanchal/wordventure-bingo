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

export type ScreenName = 'menu' | 'game' | 'win' | 'settings';

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
}
