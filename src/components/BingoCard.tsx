import { useMemo } from 'react';
import type { BingoCard as BingoCardType } from '../types';
import { nearWinIndices } from '../lib/winDetection';
import BingoCell from './BingoCell';
import styles from './BingoCard.module.css';

export interface WrongTap {
  index: number;
  /** Fresh per tap so the same cell can shake twice in a row. */
  token: number;
}

interface Props {
  card: BingoCardType;
  highlightedIndices: number[];
  wrongTap: WrongTap | null;
  reduceMotion: boolean;
  onCellClick: (word: string) => void;
  label?: string;
}

export default function BingoCard({ card, highlightedIndices, wrongTap, reduceMotion, onCellClick, label }: Props) {
  const highlighted = new Set(highlightedIndices);
  const nearWin = useMemo(() => new Set(nearWinIndices(card.cells)), [card.cells]);
  return (
    <div className={styles.wrapper}>
      {label && <h3 className={styles.label}>{label}</h3>}
      <div className={styles.grid}>
        {card.cells.map((cell, i) => (
          <BingoCell
            key={i}
            cell={cell}
            highlighted={highlighted.has(i)}
            nearWin={nearWin.has(i)}
            shakeToken={wrongTap?.index === i ? wrongTap.token : null}
            reduceMotion={reduceMotion}
            onClick={() => !cell.free && onCellClick(cell.word)}
          />
        ))}
      </div>
    </div>
  );
}
