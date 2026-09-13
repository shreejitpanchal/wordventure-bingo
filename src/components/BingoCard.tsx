import type { BingoCard as BingoCardType } from '../types';
import BingoCell from './BingoCell';
import styles from './BingoCard.module.css';

interface Props {
  card: BingoCardType;
  highlightedIndices: number[];
  onCellClick: (word: string) => void;
  label?: string;
}

export default function BingoCard({ card, highlightedIndices, onCellClick, label }: Props) {
  const highlighted = new Set(highlightedIndices);
  return (
    <div className={styles.wrapper}>
      {label && <h3 className={styles.label}>{label}</h3>}
      <div className={styles.grid}>
        {card.cells.map((cell, i) => (
          <BingoCell
            key={i}
            cell={cell}
            highlighted={highlighted.has(i)}
            onClick={() => !cell.free && onCellClick(cell.word)}
          />
        ))}
      </div>
    </div>
  );
}
