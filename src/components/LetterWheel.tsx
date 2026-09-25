import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import type { WheelTile } from '../types';
import type { SoundPlayer } from '../lib/sound';
import styles from './LetterWheel.module.css';

interface Props {
  tiles: WheelTile[];
  onWordTraced: (word: string) => void;
  sound: SoundPlayer;
  reduceMotion: boolean;
}

interface Point {
  x: number;
  y: number;
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
 *
 * A connector line (SVG overlay) is drawn through the traced tiles' centres
 * and on to the finger while dragging -- the classic word-connect feel. Its
 * points are measured from the tiles' rects in a layout effect whenever the
 * trace changes, scoped to this container.
 */
export default function LetterWheel({ tiles, onWordTraced, sound, reduceMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [traced, setTraced] = useState<number[]>([]);
  const [isPressing, setIsPressing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [pointer, setPointer] = useState<Point | null>(null);
  const visitedThisPress = useRef<number[]>([]);

  function tileIndexAt(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY);
    const tileEl = el instanceof Element ? el.closest<HTMLElement>('[data-tile-index]') : null;
    if (!tileEl) return null;
    const idx = Number(tileEl.dataset.tileIndex);
    return Number.isNaN(idx) ? null : idx;
  }

  function relativePoint(clientX: number, clientY: number): Point | null {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return null;
    return { x: clientX - box.left, y: clientY - box.top };
  }

  // Re-measure the traced tiles' centres (relative to the wheel) whenever
  // the trace changes, so the connector follows the real layout.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const next: Point[] = [];
    for (const idx of traced) {
      const el = container.querySelector<HTMLElement>(`[data-tile-index="${idx}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next.push({ x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 });
    }
    setPoints(next);
  }, [traced, tiles]);

  function addTile(idx: number) {
    // Re-tapping a selected tile is a no-op. The sound plays out here, not
    // inside the updater (updaters must stay pure); within one press
    // visitedThisPress already guarantees each idx arrives once.
    if (traced.includes(idx)) return;
    sound.play('tap');
    setTraced((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
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
    setPointer(relativePoint(e.clientX, e.clientY));
    visitedThisPress.current = [idx];
    addTile(idx);
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!isPressing) return;
    setPointer(relativePoint(e.clientX, e.clientY));
    const idx = tileIndexAt(e.clientX, e.clientY);
    if (idx === null || visitedThisPress.current.includes(idx)) return;
    visitedThisPress.current.push(idx);
    addTile(idx);
  }

  function handlePointerUp() {
    if (!isPressing) return;
    setIsPressing(false);
    setPointer(null);
    // A real drag (visited 2+ tiles in this press) submits on release, like
    // a swipe. A simple click (1 tile, no movement) just leaves it selected.
    if (visitedThisPress.current.length > 1) submit();
  }

  function handlePointerCancel() {
    setIsPressing(false);
    setPointer(null);
  }

  const tracedWord = traced.map((i) => tiles[i].letter).join('');
  const linePoints = pointer && isPressing ? [...points, pointer] : points;

  return (
    <div className={styles.wrapper}>
      <div className={styles.previewRow}>
        <div className={styles.preview} aria-live="polite">
          {tracedWord || ' ' /* reserve the line's height so the wheel doesn't jump */}
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
        {linePoints.length > 1 && (
          <svg className={styles.connector} aria-hidden="true">
            <polyline
              points={linePoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          </svg>
        )}
        {tiles.map((tile, i) => {
          const isTraced = traced.includes(i);
          return (
            <motion.div
              key={tile.id}
              data-tile-index={i}
              className={`${styles.tile} ${isTraced ? styles.tileTraced : ''}`}
              animate={reduceMotion ? undefined : { scale: isTraced ? 1.14 : 1, rotate: isTraced ? -6 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              {tile.letter}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
