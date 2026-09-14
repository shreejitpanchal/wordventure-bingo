import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import type { WheelTile } from '../types';
import styles from './LetterWheel.module.css';

interface Props {
  tiles: WheelTile[];
  onWordTraced: (word: string) => void;
  reduceMotion: boolean;
}

/**
 * Swipe/drag-to-spell letter tiles, laid out in a straight (wrapping) row
 * rather than a circle -- a circle's radius is fixed while tile count
 * varies per puzzle, so a bigger puzzle just overlapped into an unreadable
 * ring. A flex-wrap row sizes itself to however many tiles there are.
 *
 * Supports two ways of building a word, since a plain click and a drag are
 * otherwise indistinguishable: a genuine drag (pointer visits 2+ tiles
 * during one continuous press) submits on release, same as a swipe. A
 * simple click (press and release on the same tile, no movement) instead
 * ADDS that tile and waits -- clicking tiles one at a time accumulates a
 * word, confirmed with the checkmark button or cleared with the X. Tapping
 * an already-selected tile again (last one or otherwise) is a no-op, not an
 * undo -- an earlier version removed the tile on re-tap, which silently ate
 * letters whenever a kid tapped a tile twice (double-tap, re-confirming,
 * imprecise touch), producing a confusingly short/wrong word with no
 * obvious cause. The X button is the only way to remove a letter now.
 *
 * One shared pointer-capture on the container (not per-tile) so a drag
 * keeps tracking even as the pointer glides between tiles -- unifies mouse
 * (desktop) and touch (Android) via the Pointer Events API. Hit-testing uses
 * `document.elementFromPoint` (the standard technique for drag-select UIs)
 * against a `data-tile-index` attribute, rather than manually tracked DOM
 * rects -- this stays correct even while a tile is mid-scale-animation
 * (Framer Motion's `animate` on tap), which briefly perturbs a cached rect.
 */
export default function LetterWheel({ tiles, onWordTraced, reduceMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [traced, setTraced] = useState<number[]>([]);
  const [isPressing, setIsPressing] = useState(false);
  const visitedThisPress = useRef<number[]>([]);

  function tileIndexAt(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY);
    const tileEl = el instanceof Element ? el.closest<HTMLElement>('[data-tile-index]') : null;
    if (!tileEl) return null;
    const idx = Number(tileEl.dataset.tileIndex);
    return Number.isNaN(idx) ? null : idx;
  }

  function submit() {
    if (traced.length > 0) {
      onWordTraced(traced.map((i) => tiles[i].letter).join(''));
    }
    setTraced([]);
  }

  function clear() {
    setTraced([]);
  }

  function handlePointerDown(e: ReactPointerEvent) {
    const idx = tileIndexAt(e.clientX, e.clientY);
    if (idx === null) return;
    containerRef.current?.setPointerCapture(e.pointerId);
    setIsPressing(true);
    visitedThisPress.current = [idx];

    setTraced((prev) => (prev.includes(idx) ? prev : [...prev, idx])); // re-tapping a selected tile is a no-op
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!isPressing) return;
    const idx = tileIndexAt(e.clientX, e.clientY);
    if (idx === null || visitedThisPress.current.includes(idx)) return;
    visitedThisPress.current.push(idx);
    setTraced((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  }

  function handlePointerUp() {
    if (!isPressing) return;
    setIsPressing(false);
    // A real drag (visited 2+ tiles in this press) submits on release, like
    // a swipe. A simple click (1 tile, no movement) just leaves it selected.
    if (visitedThisPress.current.length > 1) submit();
  }

  function handlePointerCancel() {
    setIsPressing(false);
  }

  const tracedWord = traced.map((i) => tiles[i].letter).join('');

  return (
    <div className={styles.wrapper}>
      <div className={styles.previewRow}>
        <div className={styles.preview} aria-live="polite">
          {tracedWord || ' ' /* reserve the line's height so the wheel doesn't jump */}
        </div>
        {traced.length > 0 && (
          <div className={styles.previewActions}>
            <button type="button" className={styles.clearButton} onClick={clear} aria-label="Clear">
              ✕
            </button>
            <button type="button" className={styles.submitButton} onClick={submit} aria-label="Submit word">
              ✓
            </button>
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        className={styles.wheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {tiles.map((tile, i) => {
          const isTraced = traced.includes(i);
          return (
            <motion.div
              key={tile.id}
              data-tile-index={i}
              className={`${styles.tile} ${isTraced ? styles.tileTraced : ''}`}
              animate={reduceMotion ? undefined : { scale: isTraced ? 1.12 : 1 }}
              transition={{ duration: 0.12 }}
            >
              {tile.letter}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
