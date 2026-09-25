import { useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './Confetti.module.css';

const COLORS = ['#fb923c', '#7c3aed', '#22c55e', '#f472b6', '#facc15', '#38bdf8'];
const RAIN_COUNT = 36;
const BURST_COUNT = 44;

export type ConfettiTier = 'small' | 'big';

interface Props {
  reduceMotion: boolean;
  /** 'small' = the classic rain. 'big' = rain plus a radial firework burst
   * from the middle of the screen, for blackouts/perfect rounds. */
  tier?: ConfettiTier;
  /** Emoji/characters to rain instead of coloured rectangles -- lets each
   * mode celebrate in its own vocabulary (⭐ for Bingo, letters for
   * Wordscapes, ✓ for Sentence Quest, 🦁 for Safari). */
  glyphs?: string[];
  colors?: string[];
}

interface Piece {
  id: number;
  left: number;
  color: string;
  glyph?: string;
  delay: number;
  duration: number;
  rotate: number;
}

interface Spark {
  id: number;
  dx: number;
  dy: number;
  color: string;
  glyph?: string;
  duration: number;
}

export default function Confetti({ reduceMotion, tier = 'small', glyphs, colors = COLORS }: Props) {
  const { pieces, sparks } = useMemo(() => {
    if (reduceMotion) return { pieces: [] as Piece[], sparks: [] as Spark[] };
    const pick = <T,>(arr: readonly T[], i: number) => arr[i % arr.length];
    const pieces: Piece[] = Array.from({ length: RAIN_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: pick(colors, i),
      glyph: glyphs ? pick(glyphs, i) : undefined,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.2,
      rotate: Math.random() * 360,
    }));
    const sparks: Spark[] =
      tier === 'big'
        ? Array.from({ length: BURST_COUNT }, (_, i) => {
            const angle = (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.2;
            const distance = 140 + Math.random() * 220;
            return {
              id: i,
              dx: Math.cos(angle) * distance,
              dy: Math.sin(angle) * distance,
              color: pick(colors, i + 2),
              glyph: glyphs ? pick(glyphs, i + 1) : undefined,
              duration: 1.1 + Math.random() * 0.6,
            };
          })
        : [];
    return { pieces, sparks };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generated once per mount
  }, []);

  if (reduceMotion) return null;

  return (
    <div className={styles.field} aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={`r${p.id}`}
          className={p.glyph ? styles.glyph : styles.piece}
          style={{ left: `${p.left}%`, background: p.glyph ? undefined : p.color }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        >
          {p.glyph}
        </motion.span>
      ))}
      {sparks.map((s) => (
        <motion.span
          key={`b${s.id}`}
          className={`${s.glyph ? styles.glyph : styles.piece} ${styles.spark}`}
          style={{ background: s.glyph ? undefined : s.color }}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{ x: s.dx, y: s.dy + 160, scale: 1.2, opacity: 0, rotate: s.dx }}
          transition={{ duration: s.duration, ease: [0.15, 0.8, 0.3, 1] }}
        >
          {s.glyph}
        </motion.span>
      ))}
    </div>
  );
}
