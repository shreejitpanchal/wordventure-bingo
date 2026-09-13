import { motion } from 'framer-motion';
import type { GameConfig, Streaks, WinPattern } from '../types';
import { WORD_BANKS } from '../data/wordBanks';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Confetti from './Confetti';
import styles from './WinScreen.module.css';

interface Props {
  config: GameConfig;
  patterns: WinPattern[];
  streaks: Streaks;
  onPlayAgain: () => void;
  onMenu: () => void;
  reduceMotion: boolean;
}

const PATTERN_LABEL: Record<WinPattern, string> = {
  row: 'Row',
  column: 'Column',
  diagonal: 'Diagonal',
  corners: 'Four Corners',
  blackout: 'Blackout',
};

export default function WinScreen({ config, patterns, streaks, onPlayAgain, onMenu, reduceMotion, winnerLabel }: Props & { winnerLabel?: string }) {
  const bank = WORD_BANKS[config.category];
  const currentStreak = streaks.currentStreak[config.category] ?? 0;
  const bestStreak = streaks.bestStreak[config.category] ?? 0;
  const uniquePatterns = Array.from(new Set(patterns));

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Confetti reduceMotion={reduceMotion} />

      <motion.div
        className={styles.banner}
        variants={withReducedMotion(zoomInVariants, reduceMotion)}
        initial="initial"
        animate="animate"
      >
        <h1 className={styles.bingo}>BINGO!</h1>
        {winnerLabel && <p className={styles.winner}>{winnerLabel} wins!</p>}
        <p className={styles.patterns}>{uniquePatterns.map((p) => PATTERN_LABEL[p]).join(' + ')}</p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {bank.label} · {config.difficulty}
        </p>
        <p>
          🔥 Current streak: <strong>{currentStreak}</strong> &nbsp;|&nbsp; Best: <strong>{bestStreak}</strong>
        </p>
      </div>

      <div className={styles.actions}>
        <motion.button
          className={styles.primaryButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
        >
          Play Again
        </motion.button>
        <button className={styles.secondaryButton} onClick={onMenu}>
          Menu
        </button>
      </div>
    </motion.main>
  );
}
