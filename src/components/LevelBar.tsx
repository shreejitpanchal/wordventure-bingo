import { motion } from 'framer-motion';
import type { LevelInfo } from '../modes/badges';
import styles from './LevelBar.module.css';

interface Props {
  level: LevelInfo;
  reduceMotion: boolean;
}

/** Level badge + a bar that fills as finished games accumulate across every
 * mode (computeLevel in src/modes/badges.ts). The fill animates in from
 * its previous width so a kid sees it move after a win. */
export default function LevelBar({ level, reduceMotion }: Props) {
  const percent = Math.round(level.progress * 100);
  return (
    <div className={styles.wrapper} aria-label={`Level ${level.level}, ${level.title}`}>
      <div className={styles.header}>
        <span className={styles.levelBadge}>Lv {level.level}</span>
        <span className={styles.title}>{level.title}</span>
        <span className={styles.toNext}>{level.toNext} to go</span>
      </div>
      <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <motion.div
          className={styles.fill}
          initial={false}
          animate={{ width: `${Math.max(percent, 3)}%` }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
