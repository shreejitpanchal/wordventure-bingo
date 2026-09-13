import { useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './Confetti.module.css';

const COLORS = ['#fb923c', '#7c3aed', '#22c55e', '#f472b6', '#facc15', '#38bdf8'];
const PIECE_COUNT = 36;

interface Piece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  rotate: number;
}

export default function Confetti({ reduceMotion }: { reduceMotion: boolean }) {
  const pieces = useMemo<Piece[]>(() => {
    if (reduceMotion) return [];
    return Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.4,
      duration: 1.8 + Math.random() * 1.2,
      rotate: Math.random() * 360,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generated once per mount
  }, []);

  if (reduceMotion) return null;

  return (
    <div className={styles.field} aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className={styles.piece}
          style={{ left: `${p.left}%`, background: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
