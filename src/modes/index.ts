import type { GameMode } from '../types';
import type { AnyMode } from './types';
import { bingoMode } from './bingo';
import { wordscapesMode } from './wordscapes';
import { sentenceQuestMode } from './sentenceQuest';
import { synonymSafariMode } from './synonymSafari';

/**
 * The mode manifest. Order here is the menu's mode-chip order. To add a
 * mode: write its descriptor (bingo.ts is the template), add its id to the
 * `GameMode` union in src/types.ts, and add it to this list -- App.tsx,
 * MenuScreen and SettingsScreen pick it up from here with no other change.
 * To disable one, comment its line out.
 */
export const MODES: readonly AnyMode[] = [bingoMode, wordscapesMode, sentenceQuestMode, synonymSafariMode];

export function modeById(id: GameMode): AnyMode {
  const mode = MODES.find((m) => m.id === id);
  if (!mode) {
    throw new Error(`Unknown game mode "${id}". Register its descriptor in src/modes/index.ts.`);
  }
  return mode;
}
