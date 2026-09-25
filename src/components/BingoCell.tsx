import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardCell } from '../types';
import styles from './BingoCell.module.css';

interface Props {
  cell: CardCell;
  highlighted: boolean;
  /** This cell would complete a line on its own -- gets the "one away" glow. */
  nearWin: boolean;
  /** Changes (to a new number) each time this cell is tapped when it isn't
   * the current clue's word; triggers a head-shake. null = never. */
  shakeToken: number | null;
  reduceMotion: boolean;
  onClick: () => void;
}

const SHAKE = { x: [0, -7, 7, -5, 5, -2, 0] };

export default function BingoCell({ cell, highlighted, nearWin, shakeToken, reduceMotion, onClick }: Props) {
  const [shaking, setShaking] = useState(false);

  // A wrong tap used to do nothing at all, which read as "the app ignored
  // me". Now the cell shakes its head for ~0.4s (and GameScreen plays the
  // wrong-buzz), so a kid knows the tap landed but wasn't the answer.
  useEffect(() => {
    if (shakeToken === null) return;
    setShaking(true);
    const id = window.setTimeout(() => setShaking(false), 420);
    return () => window.clearTimeout(id);
  }, [shakeToken]);

  const classes = [
    styles.cell,
    cell.free ? styles.free : '',
    cell.marked ? styles.marked : '',
    highlighted ? styles.highlighted : '',
    nearWin && !cell.marked ? (reduceMotion ? styles.nearWinStatic : styles.nearWin) : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={cell.free}
      whileHover={!cell.free && !reduceMotion ? { scale: 1.05 } : undefined}
      whileTap={!cell.free && !reduceMotion ? { scale: 0.9 } : undefined}
      animate={shaking && !reduceMotion ? SHAKE : { x: 0 }}
      transition={{ duration: 0.4 }}
      aria-pressed={cell.marked}
    >
      <span className={styles.word}>{cell.free ? '★ FREE' : cell.word}</span>
      <AnimatePresence>
        {cell.marked && !cell.free && (
          <>
            {/* Expanding ring: a mark should feel like a stamp landing. */}
            {!reduceMotion && (
              <motion.span
                key="ripple"
                className={styles.ripple}
                initial={{ scale: 0.2, opacity: 0.8 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            )}
            <motion.span
              key="stamp"
              className={styles.stamp}
              initial={reduceMotion ? { scale: 1, rotate: -12, opacity: 1 } : { scale: 0, rotate: -40, opacity: 0 }}
              animate={{ scale: [0, 1.35, 0.95, 1], rotate: -12, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.45, times: [0, 0.5, 0.8, 1] }}
            >
              ✔
            </motion.span>
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
