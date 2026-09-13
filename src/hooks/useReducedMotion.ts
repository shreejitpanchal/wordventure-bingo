import { useEffect, useState } from 'react';

/**
 * Combines the OS-level "prefers-reduced-motion" media query with the app's
 * own in-game toggle -- either one asking for less motion should win.
 */
export function useReducedMotion(settingsReduceMotion: boolean): boolean {
  const [osPrefers, setOsPrefers] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setOsPrefers(mql.matches);
    const listener = (e: MediaQueryListEvent) => setOsPrefers(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  return settingsReduceMotion || osPrefers;
}
