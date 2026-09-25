import type { Difficulty, GameMode } from '../types';
import type { MenuSelection, ModeConfigBase } from './types';
import { MODES } from './index';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Every mode on its default config, first mode selected, easy. */
export function defaultMenuSelection(): MenuSelection {
  return {
    modeId: MODES[0].id,
    difficulty: 'easy',
    configs: Object.fromEntries(MODES.map((m) => [m.id, m.defaultConfig])) as Record<GameMode, ModeConfigBase>,
  };
}

/**
 * Rebuilds a valid MenuSelection from whatever storage handed back. storage.ts
 * only guarantees "a plain object or null"; this is where the mode-aware
 * checks live (storage.ts must not know about MODES): an unknown mode id
 * falls back to the first mode, an unknown category to the mode's default,
 * and each mode's stored options are kept field-by-field only where the
 * field exists on its default config with the same primitive type -- so a
 * removed option, a renamed mode or a hand-edited value can't leak a bad
 * config into a game screen.
 */
export function resolveMenuSelection(stored: Record<string, unknown> | null): MenuSelection {
  const selection = defaultMenuSelection();
  if (!stored) return selection;

  if (MODES.some((m) => m.id === stored.modeId)) {
    selection.modeId = stored.modeId as GameMode;
  }
  if (DIFFICULTIES.includes(stored.difficulty as Difficulty)) {
    selection.difficulty = stored.difficulty as Difficulty;
  }

  const storedConfigs = isPlainObject(stored.configs) ? stored.configs : {};
  for (const mode of MODES) {
    const raw = storedConfigs[mode.id];
    if (!isPlainObject(raw)) continue;
    const config: Record<string, unknown> = { ...mode.defaultConfig };
    for (const [key, defaultValue] of Object.entries(mode.defaultConfig)) {
      const value = raw[key];
      if (typeof value === typeof defaultValue) config[key] = value;
    }
    if (!mode.categories.some((c) => c.id === config.category)) {
      config.category = mode.defaultConfig.category;
    }
    // The shared difficulty lives at the top level; keep the per-mode copy
    // in step so a config is self-consistent wherever it's read.
    config.difficulty = selection.difficulty;
    selection.configs[mode.id] = config as ModeConfigBase;
  }
  return selection;
}
