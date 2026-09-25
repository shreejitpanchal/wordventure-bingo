import { useEffect, useState } from 'react';

/**
 * True once the player hasn't touched the screen (pointer or key) for
 * `timeoutMs`; flips back to false on the next interaction. Drives the
 * menu's nudges (pulsing Start button, mascot pointing, then dozing off) --
 * the goal is a gentle "hey, still here?" for a distracted kid, not a
 * nag, so callers pick generous timeouts.
 */
export function useIdle(timeoutMs: number): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), timeoutMs);
    function reset() {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), timeoutMs);
    }
    window.addEventListener('pointerdown', reset);
    window.addEventListener('keydown', reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [timeoutMs]);

  return idle;
}
