import type { DailyRecord, Settings, WordEntry } from '../types';

const KEYS = {
  settings: 'wordventure:settings',
  freeplayWords: 'wordventure:freeplayWords',
  profiles: 'wordventure:profiles',
  currentProfile: 'wordventure:currentProfile',
  avatars: 'wordventure:avatars',
} as const;

// Pre-profile-era keys: the device-wide stats this app used before named
// local profiles existed. Read only once, by createProfile's migration.
// They migrate into the per-profile buckets whose mode `stats.key` values
// ('streaks', 'wordscapesStats' -- see src/modes/) are kept identical to
// the historical per-profile key names so existing players' data loads.
const LEGACY_KEYS = {
  streaks: 'wordventure:streaks',
  wordscapesStats: 'wordventure:wordscapesStats',
} as const;
const LEGACY_MODE_STATS_KEYS = { streaks: 'streaks', wordscapesStats: 'wordscapesStats' } as const;

/** Per-profile stats bucket for one mode -- see ModeDescriptor.stats.key. */
function modeStatsKey(statsKey: string, profile: string): string {
  return `wordventure:${statsKey}:${profile}`;
}

const DEFAULT_SETTINGS: Settings = { soundEnabled: true, reduceMotion: false, theme: 'system', fontSize: 'medium' };

// --- Shape guards -----------------------------------------------------------
//
// localStorage is this app's one external input: anything could be sitting
// under our keys (a corrupted write, a hand-edited value, an older schema).
// Every read validates the parsed JSON's shape before trusting it and falls
// back to the default otherwise -- a bad stored value must never take the
// app down, since the player has no way to fix it from inside the app.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isPlainObject(value) && Object.values(value).every((v) => typeof v === 'string');
}

function isDailyRecord(value: unknown): value is DailyRecord {
  return (
    isPlainObject(value) &&
    (value.lastCompleted === null || typeof value.lastCompleted === 'string') &&
    typeof value.streak === 'number' &&
    Number.isFinite(value.streak)
  );
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isPlainObject(value) && Object.values(value).every((n) => typeof n === 'number' && Number.isFinite(n));
}

function isWordEntryArray(value: unknown): value is WordEntry[] {
  return (
    Array.isArray(value) &&
    value.every((w) => isPlainObject(w) && typeof w.word === 'string' && typeof w.definition === 'string')
  );
}

/**
 * localStorage can throw (private browsing, disabled storage, quota) or
 * simply be absent -- this is the one boundary in the app that touches an
 * external API, so it's the one place that needs a try/catch fallback.
 * `isValid` rejects a parsed value of the wrong shape the same way.
 */
function readJSON<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
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

// --- Settings (device-wide) -------------------------------------------------

export function getSettings(): Settings {
  // Merge over defaults so a setting added after a player first saved
  // settings still gets its default rather than `undefined`. Stale keys
  // from removed settings ride along harmlessly.
  const stored = readJSON<Record<string, unknown>>(KEYS.settings, {}, isPlainObject) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: Settings): void {
  writeJSON(KEYS.settings, settings);
}

// --- Profiles --------------------------------------------------------------
//
// Named local profiles, not accounts: no auth, no network, just separate
// localStorage buckets on this device so siblings/family sharing one
// device/tablet each keep their own per-mode stats. Everything else
// (settings, the Free Play word list) stays device-wide -- those are
// device/accessibility preferences and shared content, not per-player
// statistics, so scoping them per profile isn't warranted.

export function getProfiles(): string[] {
  return readJSON<string[]>(KEYS.profiles, [], isStringArray);
}

export function getCurrentProfile(): string | null {
  return readJSON<string | null>(KEYS.currentProfile, null, (v): v is string | null => typeof v === 'string');
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
    const legacyStreaks = readJSON<Record<string, unknown> | null>(LEGACY_KEYS.streaks, null, isPlainObject);
    const legacyStats = readJSON<Record<string, unknown> | null>(LEGACY_KEYS.wordscapesStats, null, isPlainObject);
    if (legacyStreaks) writeJSON(modeStatsKey(LEGACY_MODE_STATS_KEYS.streaks, trimmed), legacyStreaks);
    if (legacyStats) writeJSON(modeStatsKey(LEGACY_MODE_STATS_KEYS.wordscapesStats, trimmed), legacyStats);
  }
}

// --- Avatars (one emoji per profile name, device-wide map) -----------------

export function getAvatars(): Record<string, string> {
  return readJSON<Record<string, string>>(KEYS.avatars, {}, isStringRecord);
}

export function saveAvatar(profile: string, emoji: string): void {
  writeJSON(KEYS.avatars, { ...getAvatars(), [profile]: emoji });
}

// --- Daily challenge (per profile) ------------------------------------------

function dailyKey(profile: string): string {
  return `wordventure:daily:${profile}`;
}

export function getDailyRecord(profile: string): DailyRecord {
  return readJSON<DailyRecord>(dailyKey(profile), { lastCompleted: null, streak: 0 }, isDailyRecord);
}

export function saveDailyRecord(profile: string, record: DailyRecord): void {
  writeJSON(dailyKey(profile), record);
}

// --- Per-mode stats (per profile) -------------------------------------------
//
// Generic over the mode: every mode's stats record is an object of
// per-category number maps (e.g. { wins: { animals: 3 }, ... }), and the
// mode descriptor (src/modes/) owns both the shape (`defaults`) and the
// arithmetic (`record`/`recordAbandon`). This layer only persists it.

/**
 * Loads one mode's stats for a profile, field-by-field over `defaults`: a
 * stored field of the wrong shape (or a field added to the mode after the
 * player's last save) falls back to its default rather than poisoning the
 * whole record.
 */
export function getModeStats<TStats extends Record<string, Record<string, number>>>(
  statsKey: string,
  profile: string,
  defaults: TStats,
): TStats {
  const stored = readJSON<Record<string, unknown>>(modeStatsKey(statsKey, profile), {}, isPlainObject);
  const result: Record<string, Record<string, number>> = {};
  for (const field of Object.keys(defaults)) {
    const value = stored[field];
    result[field] = isNumberRecord(value) ? { ...value } : { ...defaults[field] };
  }
  return result as TStats;
}

export function saveModeStats(statsKey: string, profile: string, stats: Record<string, Record<string, number>>): void {
  writeJSON(modeStatsKey(statsKey, profile), stats);
}

// --- Menu selection (per profile) -------------------------------------------
//
// The menu's last picks (mode, difficulty, each mode's options), so a
// player returns to the setup they were using. Per profile for the same
// reason stats are: siblings sharing a device play different things. This
// layer only checks "is it an object"; src/modes/menuSelection.ts does the
// mode-aware validation, since storage.ts must not know about MODES.

function menuSelectionKey(profile: string): string {
  return `wordventure:menuSelection:${profile}`;
}

export function getMenuSelection(profile: string): Record<string, unknown> | null {
  return readJSON<Record<string, unknown> | null>(menuSelectionKey(profile), null, isPlainObject);
}

export function saveMenuSelection(profile: string, selection: object): void {
  writeJSON(menuSelectionKey(profile), selection);
}

// --- Free Play word list (device-wide) --------------------------------------

export function getFreeplayWords(): WordEntry[] {
  return readJSON<WordEntry[]>(KEYS.freeplayWords, [], isWordEntryArray);
}

export function saveFreeplayWords(words: WordEntry[]): void {
  writeJSON(KEYS.freeplayWords, words);
}
