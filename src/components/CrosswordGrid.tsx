import { motion } from 'framer-motion';
import type { WordscapesGrid } from '../types';
import styles from './CrosswordGrid.module.css';

interface Props {
  grid: WordscapesGrid;
  reduceMotion: boolean;
  onCellClick?: (row: number, col: number) => void;
}

export default function CrosswordGrid({ grid, reduceMotion, onCellClick }: Props) {
  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        aspectRatio: `${grid.cols} / ${grid.rows}`,
      }}
    >
      {Array.from({ length: grid.rows }).flatMap((_, row) =>
        Array.from({ length: grid.cols }).map((_, col) => {
          const cell = grid.cells.get(`${row},${col}`);
          if (!cell) return <div key={`${row}-${col}`} className={styles.blank} />;
          return (
            <button
              key={`${row}-${col}`}
              type="button"
              className={`${styles.cell} ${cell.revealed ? styles.cellRevealed : ''}`}
              onClick={() => onCellClick?.(row, col)}
              aria-label={cell.revealed ? cell.letter : 'Show a hint for this word'}
            >
              {cell.revealed && (
                <motion.span
                  // Letters of a just-revealed word drop in one after another
                  // (staggered by grid position) rather than all at once --
                  // reads as the word "landing" in the grid.
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.3, y: -14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 18, delay: (row + col) * 0.045 }
                  }
                >
                  {cell.letter}
                </motion.span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
