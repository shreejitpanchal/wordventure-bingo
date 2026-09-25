import { motion } from 'framer-motion';
import type { BingoResult, GameConfig, Streaks, WinPattern } from '../types';
import type { ModeWinScreenProps } from '../modes/types';
import { WORD_BANK_LABELS } from '../data/wordBankLabels';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Confetti from './Confetti';
import styles from './WinScreen.module.css';

type Props = ModeWinScreenProps<GameConfig, BingoResult, Streaks>;

const PATTERN_LABEL: Record<WinPattern, string> = {
  row: 'Row',
  column: 'Column',
  diagonal: 'Diagonal',
  corners: 'Four Corners',
  blackout: 'Blackout',
};

export default function WinScreen({ config, result, stats, onPlayAgain, onMenu, reduceMotion }: Props) {
  const label = WORD_BANK_LABELS[config.category];
  const currentStreak = stats.currentStreak[config.category] ?? 0;
  const bestStreak = stats.bestStreak[config.category] ?? 0;
  const uniquePatterns = Array.from(new Set(result.patterns));

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
        {result.winnerLabel && <p className={styles.winner}>{result.winnerLabel} wins!</p>}
        <p className={styles.patterns}>{uniquePatterns.map((p) => PATTERN_LABEL[p]).join(' + ')}</p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {label} · {config.difficulty}
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
