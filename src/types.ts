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

export type ScreenName =
  | 'profile'
  | 'menu'
  | 'game'
  | 'win'
  | 'settings'
  | 'wordscapes-game'
  | 'wordscapes-win'
  | 'sentence-quest-game'
  | 'sentence-quest-win'
  | 'synonym-safari-game'
  | 'synonym-safari-win';

export type GameMode = 'bingo' | 'wordscapes' | 'sentence-quest' | 'synonym-safari';

/** 'system' follows the OS/browser's own light/dark preference; 'light'/'dark'
 * force it regardless -- see theme.css's [data-theme] selectors. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Scales the whole app's rem-based type via html's root font-size -- see
 * theme.css's [data-font-size] selectors. */
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface Settings {
  soundEnabled: boolean;
  reduceMotion: boolean;
  theme: ThemePreference;
  fontSize: FontSize;
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

// --- Sentence Quest (fill-in-the-blank grammar mode) --------------------

/** Grammar-focused, not vocabulary/topic-focused like CategoryId -- Sentence
 * Quest exists specifically to build grammar/usage skills, so its
 * categories are grammar concepts rather than themes like Bingo/Wordscapes. */
export type SentenceQuestCategoryId = 'verbTense' | 'prepositions' | 'synonymsAntonyms' | 'idioms' | 'grammarBasics';

export interface SentenceQuestion {
  /** The missing word's position is marked with "___" (three underscores);
   * exactly one occurrence per sentence. */
  sentence: string;
  /** Always exactly 4 entries (1 correct + 3 distractors); order is
   * whatever's authored here -- generateRound shuffles per-question. */
  options: string[];
  /** Must equal exactly one entry in `options`, string-for-string. */
  answer: string;
  difficulty: Difficulty;
  /** One clear sentence explaining why `answer` is correct, shown as
   * feedback after the player answers -- this is the actual teaching
   * moment, not just a right/wrong signal. */
  explanation: string;
}

export interface SentenceQuestBank {
  category: SentenceQuestCategoryId;
  label: string;
  questions: SentenceQuestion[];
}

export interface SentenceQuestConfig {
  category: SentenceQuestCategoryId;
  difficulty: Difficulty;
  /** How many questions make up one round. */
  questionCount: number;
}

export interface SentenceQuestStats {
  roundsCompleted: Record<string, number>;
  /** Every correct answer ever, per category -- tracked independently of
   * roundsCompleted so a round abandoned partway through (exiting to menu
   * mid-round) still credits whatever was genuinely answered correctly. */
  correctAnswers: Record<string, number>;
  questionsAnswered: Record<string, number>;
}

// --- Synonym Safari (tap-to-connect matching mode) ----------------------

/** Not CategoryId -- that's vocabulary themes; Synonym Safari's axis is the
 * word *relation* being tested, and each one maps 1:1 to a bank file -- see
 * synonymSafariBanks.ts. (No 'mixed' option: it was tried and dropped --
 * combining both banks in one round meant the same source word could appear
 * once per bank with two different, contradictory correct matches.) */
export type SynonymSafariCategoryId = 'synonyms' | 'antonyms';

export interface WordPair {
  word: string;
  match: string;
  difficulty: Difficulty;
}

export interface SynonymSafariBank {
  relation: 'synonym' | 'antonym';
  label: string;
  pairs: WordPair[];
}

export interface SynonymSafariConfig {
  category: SynonymSafariCategoryId;
  difficulty: Difficulty;
  /** How many pairs make up one round. */
  pairCount: number;
}

export interface SynonymSafariStats {
  roundsCompleted: Record<string, number>;
  /** Every pair locked in ever, per category -- credited the same way
   * regardless of whether the round was solved unaided or via the hint
   * button (mirrors Wordscapes' bonusWordsFound, not Sentence Quest's
   * correctAnswers -- there's no "wrong pair" outcome here to weigh it
   * against). */
  pairsMatched: Record<string, number>;
}
