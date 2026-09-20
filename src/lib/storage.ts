import type { Settings, SentenceQuestStats, Streaks, SynonymSafariStats, WordEntry, WordscapesStats } from '../types';

const KEYS = {
  settings: 'wordventure:settings',
  freeplayWords: 'wordventure:freeplayWords',
  profiles: 'wordventure:profiles',
  currentProfile: 'wordventure:currentProfile',
} as const;

// Pre-profile-era keys: the device-wide stats this app used before named
// local profiles existed. Read only once, by createProfile's migration.
const LEGACY_KEYS = {
  streaks: 'wordventure:streaks',
  wordscapesStats: 'wordventure:wordscapesStats',
} as const;

function streaksKey(profile: string): string {
  return `wordventure:streaks:${profile}`;
}

function wordscapesStatsKey(profile: string): string {
  return `wordventure:wordscapesStats:${profile}`;
}

function sentenceQuestStatsKey(profile: string): string {
  return `wordventure:sentenceQuestStats:${profile}`;
}

function synonymSafariStatsKey(profile: string): string {
  return `wordventure:synonymSafariStats:${profile}`;
}

const DEFAULT_SETTINGS: Settings = { soundEnabled: false, reduceMotion: false, theme: 'system', fontSize: 'medium' };
const DEFAULT_STREAKS: Streaks = { gamesPlayed: {}, wins: {}, currentStreak: {}, bestStreak: {} };
const DEFAULT_WORDSCAPES_STATS: WordscapesStats = { puzzlesCompleted: {}, bonusWordsFound: {} };
const DEFAULT_SENTENCE_QUEST_STATS: SentenceQuestStats = { roundsCompleted: {}, correctAnswers: {}, questionsAnswered: {} };
const DEFAULT_SYNONYM_SAFARI_STATS: SynonymSafariStats = { roundsCompleted: {}, pairsMatched: {} };

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

// --- Profiles --------------------------------------------------------------
//
// Named local profiles, not accounts: no auth, no network, just separate
// localStorage buckets on this device so siblings/family sharing one
// device/tablet each keep their own Bingo streaks and Wordscapes stats.
// Everything else (settings, the Free Play word list) stays device-wide --
// those are device/accessibility preferences and shared content, not
// per-player statistics, so scoping them per profile isn't warranted.

export function getProfiles(): string[] {
  return readJSON<string[]>(KEYS.profiles, []);
}

export function getCurrentProfile(): string | null {
  return readJSON<string | null>(KEYS.currentProfile, null);
}

/**
 * Selects `name` as the active profile, adding it to the known-profiles
 * list if it's new. If this is the very first profile ever created on this
 * device, it also inherits any pre-profile-era streaks/stats so upgrading
 * doesn't silently reset an existing player's progress to zero -- there's
 * no way to know whose progress that was, so the first person to pick a
 * name gets it.
 */
export function createProfile(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  const profiles = getProfiles();
  const isFirstEverProfile = profiles.length === 0;
  if (!profiles.includes(trimmed)) {
    writeJSON(KEYS.profiles, [...profiles, trimmed]);
  }
  writeJSON(KEYS.currentProfile, trimmed);

  if (isFirstEverProfile) {
    const legacyStreaks = readJSON<Streaks | null>(LEGACY_KEYS.streaks, null);
    const legacyStats = readJSON<WordscapesStats | null>(LEGACY_KEYS.wordscapesStats, null);
    if (legacyStreaks) writeJSON(streaksKey(trimmed), legacyStreaks);
    if (legacyStats) writeJSON(wordscapesStatsKey(trimmed), legacyStats);
  }
}

// --- Bingo streaks (per profile) -------------------------------------------

export function getStreaks(profile: string): Streaks {
  return { ...DEFAULT_STREAKS, ...readJSON(streaksKey(profile), DEFAULT_STREAKS) };
}

export function recordGameResult(profile: string, category: string, won: boolean): Streaks {
  const streaks = getStreaks(profile);
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
  writeJSON(streaksKey(profile), streaks);
  return streaks;
}

// --- Wordscapes stats (per profile) -----------------------------------------

export function getWordscapesStats(profile: string): WordscapesStats {
  return { ...DEFAULT_WORDSCAPES_STATS, ...readJSON(wordscapesStatsKey(profile), DEFAULT_WORDSCAPES_STATS) };
}

/**
 * `solved` gates the "puzzles completed" counter only -- a puzzle given up
 * on (grid revealed via the give-up button, not actually solved) still
 * credits any bonus words genuinely found first, it just doesn't count as
 * a completion.
 */
export function recordWordscapesCompletion(
  profile: string,
  category: string,
  bonusWordsFoundCount: number,
  solved: boolean,
): WordscapesStats {
  const stats = getWordscapesStats(profile);
  if (solved) {
    stats.puzzlesCompleted[category] = (stats.puzzlesCompleted[category] ?? 0) + 1;
  }
  if (bonusWordsFoundCount > 0) {
    stats.bonusWordsFound[category] = (stats.bonusWordsFound[category] ?? 0) + bonusWordsFoundCount;
  }
  writeJSON(wordscapesStatsKey(profile), stats);
  return stats;
}

// --- Sentence Quest stats (per profile) -------------------------------------
//
// Unlike Bingo streaks/Wordscapes stats, there's no pre-profile-era legacy
// key to migrate here -- this feature was added after profiles already
// existed, so it's profile-scoped from day one with nothing to inherit.

export function getSentenceQuestStats(profile: string): SentenceQuestStats {
  return { ...DEFAULT_SENTENCE_QUEST_STATS, ...readJSON(sentenceQuestStatsKey(profile), DEFAULT_SENTENCE_QUEST_STATS) };
}

/**
 * `correctCount`/`totalCount` are credited even if the round was abandoned
 * partway through (exiting to menu mid-round) -- only `roundsCompleted`
 * requires `completed: true`, mirroring how Wordscapes credits bonus words
 * found before a give-up separately from the "puzzles completed" counter.
 */
export function recordSentenceQuestRound(
  profile: string,
  category: string,
  correctCount: number,
  totalCount: number,
  completed: boolean,
): SentenceQuestStats {
  const stats = getSentenceQuestStats(profile);
  if (completed) {
    stats.roundsCompleted[category] = (stats.roundsCompleted[category] ?? 0) + 1;
  }
  stats.correctAnswers[category] = (stats.correctAnswers[category] ?? 0) + correctCount;
  stats.questionsAnswered[category] = (stats.questionsAnswered[category] ?? 0) + totalCount;
  writeJSON(sentenceQuestStatsKey(profile), stats);
  return stats;
}

// --- Synonym Safari stats (per profile) -------------------------------------
//
// Same no-legacy-migration situation as Sentence Quest: this feature was
// added after profiles already existed, so it's profile-scoped from day one.

export function getSynonymSafariStats(profile: string): SynonymSafariStats {
  return { ...DEFAULT_SYNONYM_SAFARI_STATS, ...readJSON(synonymSafariStatsKey(profile), DEFAULT_SYNONYM_SAFARI_STATS) };
}

/**
 * `solved` gates "rounds completed" only -- an assisted round (any hint
 * used) still credits every pair genuinely locked in, it just doesn't count
 * as a real, unaided completion. Mirrors recordWordscapesCompletion, not
 * recordSentenceQuestRound: there's no wrong-pair outcome here to weigh
 * pairsMatched against the way questionsAnswered weighs correctAnswers.
 */
export function recordSynonymSafariRound(
  profile: string,
  category: string,
  pairsMatchedCount: number,
  solved: boolean,
): SynonymSafariStats {
  const stats = getSynonymSafariStats(profile);
  if (solved) {
    stats.roundsCompleted[category] = (stats.roundsCompleted[category] ?? 0) + 1;
  }
  if (pairsMatchedCount > 0) {
    stats.pairsMatched[category] = (stats.pairsMatched[category] ?? 0) + pairsMatchedCount;
  }
  writeJSON(synonymSafariStatsKey(profile), stats);
  return stats;
}

// --- Free Play word list (device-wide) --------------------------------------

export function getFreeplayWords(): WordEntry[] {
  return readJSON<WordEntry[]>(KEYS.freeplayWords, []);
}

export function saveFreeplayWords(words: WordEntry[]): void {
  writeJSON(KEYS.freeplayWords, words);
}
