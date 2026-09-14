import type { Settings, Streaks, WordEntry, WordscapesStats } from '../types';

const KEYS = {
  settings: 'wordventure:settings',
  streaks: 'wordventure:streaks',
  freeplayWords: 'wordventure:freeplayWords',
  wordscapesStats: 'wordventure:wordscapesStats',
} as const;

const DEFAULT_SETTINGS: Settings = { soundEnabled: false, reduceMotion: false };
const DEFAULT_STREAKS: Streaks = { gamesPlayed: {}, wins: {}, currentStreak: {}, bestStreak: {} };
const DEFAULT_WORDSCAPES_STATS: WordscapesStats = { puzzlesCompleted: {}, bonusWordsFound: {} };

/**
 * localStorage can throw (private browsing, disabled storage, quota) or
 * simply be absent -- this is the one boundary in the app that touches an
 * external API, so it's the one place that needs a try/catch fallback.
 */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable -- the game still works for this session, it just
    // won't remember progress. Nothing actionable for the player to do.
  }
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, DEFAULT_SETTINGS) };
}

export function saveSettings(settings: Settings): void {
  writeJSON(KEYS.settings, settings);
}

export function getStreaks(): Streaks {
  return { ...DEFAULT_STREAKS, ...readJSON(KEYS.streaks, DEFAULT_STREAKS) };
}

export function recordGameResult(category: string, won: boolean): Streaks {
  const streaks = getStreaks();
  streaks.gamesPlayed[category] = (streaks.gamesPlayed[category] ?? 0) + 1;
  if (won) {
    streaks.wins[category] = (streaks.wins[category] ?? 0) + 1;
    streaks.currentStreak[category] = (streaks.currentStreak[category] ?? 0) + 1;
    streaks.bestStreak[category] = Math.max(
      streaks.bestStreak[category] ?? 0,
      streaks.currentStreak[category],
    );
  } else {
    streaks.currentStreak[category] = 0;
  }
  writeJSON(KEYS.streaks, streaks);
  return streaks;
}

export function getWordscapesStats(): WordscapesStats {
  return { ...DEFAULT_WORDSCAPES_STATS, ...readJSON(KEYS.wordscapesStats, DEFAULT_WORDSCAPES_STATS) };
}

/**
 * `solved` gates the "puzzles completed" counter only -- a puzzle given up
 * on (grid revealed via the give-up button, not actually solved) still
 * credits any bonus words genuinely found first, it just doesn't count as
 * a completion.
 */
export function recordWordscapesCompletion(category: string, bonusWordsFoundCount: number, solved: boolean): WordscapesStats {
  const stats = getWordscapesStats();
  if (solved) {
    stats.puzzlesCompleted[category] = (stats.puzzlesCompleted[category] ?? 0) + 1;
  }
  if (bonusWordsFoundCount > 0) {
    stats.bonusWordsFound[category] = (stats.bonusWordsFound[category] ?? 0) + bonusWordsFoundCount;
  }
  writeJSON(KEYS.wordscapesStats, stats);
  return stats;
}

export function getFreeplayWords(): WordEntry[] {
  return readJSON<WordEntry[]>(KEYS.freeplayWords, []);
}

export function saveFreeplayWords(words: WordEntry[]): void {
  writeJSON(KEYS.freeplayWords, words);
}
