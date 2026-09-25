import type { ComponentType, LazyExoticComponent } from 'react';
import type { Difficulty, GameMode, WordEntry } from '../types';

/**
 * The contract every game mode fulfils so App.tsx, MenuScreen and
 * SettingsScreen can drive any mode generically. Adding a mode means writing
 * one descriptor (see bingo.ts for the template) and adding one line to
 * MODES in index.ts -- none of those three components change.
 *
 * Type parameters:
 * - TConfig: what the menu builds and the game screen consumes.
 * - TResult: what a finished game reports back (drives the win screen and
 *   the stats update).
 * - TStats: the per-profile stats record persisted for this mode.
 */

/** Every mode's config carries these two; the menu edits them generically. */
export interface ModeConfigBase {
  category: string;
  difficulty: Difficulty;
}

/** Device-wide inputs a game screen may need that aren't part of its own
 * config. Owned and loaded by App.tsx (via storage.ts) and passed down --
 * screens never read storage themselves. */
export interface ModeContext {
  /** The parent-edited Free Play word list, merged into the `freeplay`
   * category by the modes that use word banks. */
  freeplayWords: WordEntry[];
}

export interface ModeGameScreenProps<TConfig, TResult> {
  config: TConfig;
  context: ModeContext;
  /** Whatever the *previous* round of this mode (in this session) reported
   * via `onRoundStart` -- words, sentences, ... -- so the generator can
   * avoid dealing the same content back to back. Empty on the first round. */
  excludeItems: string[];
  /** Fire once, right after the round is built, with the items to avoid
   * next time. Modes with no repeat-avoidance concept simply never call it. */
  onRoundStart: (items: string[]) => void;
  onComplete: (result: TResult) => void;
  onExit: () => void;
  reduceMotion: boolean;
}

export interface ModeWinScreenProps<TConfig, TResult, TStats> {
  config: TConfig;
  result: TResult;
  stats: TStats;
  onPlayAgain: () => void;
  onMenu: () => void;
  reduceMotion: boolean;
}

/** Renders the mode's *extra* menu sections (players, call speed, word
 * count, ...). Category and difficulty are common to every mode and rendered
 * by MenuScreen itself. */
export interface ModeMenuOptionsProps<TConfig, TStats> {
  config: TConfig;
  stats: TStats;
  onChange: (config: TConfig) => void;
}

export interface ModeStatLine {
  label: string;
  value: number;
}

/** Every mode's stats record: named fields, each a per-category number map. */
export type ModeStatsRecord = Record<string, Record<string, number>>;

export interface ModeDescriptor<TConfig extends ModeConfigBase, TResult, TStats extends ModeStatsRecord> {
  id: GameMode;
  label: string;
  emoji: string;
  /** Menu order and display labels. Kept as a small static list (not read
   * from the bank JSON) so the menu never has to load a mode's content
   * chunk just to list its categories. */
  categories: readonly { id: TConfig['category']; label: string }[];
  defaultConfig: TConfig;
  MenuOptions: ComponentType<ModeMenuOptionsProps<TConfig, TStats>>;
  /** One-line per-category progress shown under the menu options, or null
   * to show nothing (e.g. no games played yet in that category). */
  menuStatLine: (config: TConfig, stats: TStats) => string | null;
  /** Lazy so each mode's screens *and* its content banks live in their own
   * chunk, loaded (and parsed) only when that mode is first played. Workbox
   * still precaches every chunk, so this costs nothing offline. */
  GameScreen: LazyExoticComponent<ComponentType<ModeGameScreenProps<TConfig, TResult>>>;
  WinScreen: LazyExoticComponent<ComponentType<ModeWinScreenProps<TConfig, TResult, TStats>>>;
  stats: {
    /** Storage key segment: stats persist at `wordventure:<key>:<profile>`.
     * Must be unique across modes and, for modes that predate this
     * registry, must keep its historical value so existing data loads. */
    key: string;
    defaults: TStats;
    /** Pure: returns the updated stats after a finished game. Must not
     * mutate `stats`. */
    record: (stats: TStats, config: TConfig, result: TResult) => TStats;
    /** Pure, optional: applied when the player leaves the game screen
     * without finishing (visible exit or hardware back). Omit if quitting
     * carries no stats meaning for the mode. */
    recordAbandon?: (stats: TStats, config: TConfig) => TStats;
    /** All-category aggregate lines for the Settings stats card. */
    summary: (stats: TStats) => ModeStatLine[];
  };
}

/** The menu's picks -- which mode, the shared difficulty, and every mode's
 * own draft config. Remembered per profile (see menuSelection.ts) so
 * returning from a game, or reopening the app, lands on the same setup. */
export interface MenuSelection {
  modeId: GameMode;
  difficulty: Difficulty;
  configs: Record<GameMode, ModeConfigBase>;
}

/** A descriptor with its type parameters erased, for the manifest and the
 * generic consumers (App/Menu/Settings). Only `defineMode` produces one. */
export type AnyMode = ModeDescriptor<ModeConfigBase, unknown, ModeStatsRecord>;

/**
 * The single place a concrete descriptor is widened to `AnyMode`. Generic
 * consumers only ever pass a mode's own config/result/stats back into that
 * same mode's functions, so the erasure is sound in practice; keeping the
 * cast here (not at every call site) keeps that reasoning in one spot.
 */
export function defineMode<TConfig extends ModeConfigBase, TResult, TStats extends ModeStatsRecord>(
  descriptor: ModeDescriptor<TConfig, TResult, TStats>,
): AnyMode {
  return descriptor as unknown as AnyMode;
}

/** Immutable per-category increment -- the one arithmetic every mode's
 * `record` function is built from. */
export function bump(record: Record<string, number>, key: string, delta = 1): Record<string, number> {
  return { ...record, [key]: (record[key] ?? 0) + delta };
}

/** Sums a per-category Record<string, number> into one overall total. */
export function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((total, n) => total + n, 0);
}

export function maxValue(record: Record<string, number>): number {
  return Object.values(record).reduce((max, n) => Math.max(max, n), 0);
}
