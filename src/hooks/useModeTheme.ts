import { useEffect } from 'react';
import type { GameMode } from '../types';

/**
 * Mirrors useAppearance: one data-attribute swap on <html> that theme.css's
 * `html[data-mode='...']` blocks key off, recolouring primary/accent tokens
 * for the mode the player is looking at (the menu's selected mode, or the
 * mode being played). Components stay unaware -- they consume var(--color-*)
 * exactly as before, which is the whole point of doing it here rather than
 * threading a palette through props.
 */
export function useModeTheme(modeId: GameMode): void {
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', modeId);
  }, [modeId]);
}
