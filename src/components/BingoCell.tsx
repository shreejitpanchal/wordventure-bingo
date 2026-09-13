import { motion, AnimatePresence } from 'framer-motion';
import type { CardCell } from '../types';
import styles from './BingoCell.module.css';

interface Props {
  cell: CardCell;
  highlighted: boolean;
  onClick: () => void;
}

export default function BingoCell({ cell, highlighted, onClick }: Props) {
  const classes = [
    styles.cell,
    cell.free ? styles.free : '',
    cell.marked ? styles.marked : '',
    highlighted ? styles.highlighted : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={cell.free}
      whileHover={!cell.free ? { scale: 1.05 } : undefined}
      whileTap={!cell.free ? { scale: 0.92 } : undefined}
      aria-pressed={cell.marked}
    >
      <span className={styles.word}>{cell.free ? '★ FREE' : cell.word}</span>
      <AnimatePresence>
        {cell.marked && !cell.free && (
          <motion.span
            className={styles.stamp}
            initial={{ scale: 0, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
          >
            ✔
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
