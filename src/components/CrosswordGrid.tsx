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
              className={styles.cell}
              onClick={() => onCellClick?.(row, col)}
              aria-label={cell.revealed ? cell.letter : 'Show a hint for this word'}
            >
              {cell.revealed && (
                <motion.span
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.25, type: 'spring', stiffness: 400, damping: 20 }}
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
