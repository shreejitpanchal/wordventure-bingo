import { motion } from 'framer-motion';
import type { WordscapesConfig, WordscapesStats } from '../types';
import { WORD_BANKS } from '../data/wordBanks';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Confetti from './Confetti';
import styles from './WinScreen.module.css';

interface Props {
  config: WordscapesConfig;
  bonusWordsFound: number;
  /** True if the player used any reveal help (single-letter hints and/or
   * Give Up) anywhere in this puzzle. */
  assisted: boolean;
  stats: WordscapesStats;
  onNextPuzzle: () => void;
  onMenu: () => void;
  reduceMotion: boolean;
}

export default function WordscapesWinScreen({ config, bonusWordsFound, assisted, stats, onNextPuzzle, onMenu, reduceMotion }: Props) {
  const bank = WORD_BANKS[config.category];
  const totalCompleted = stats.puzzlesCompleted[config.category] ?? 0;

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* No confetti for an assisted puzzle -- it wasn't fully solved
          unaided, celebrating it the same way as a real win would ring hollow. */}
      {!assisted && <Confetti reduceMotion={reduceMotion} />}

      <motion.div
        className={styles.banner}
        variants={withReducedMotion(zoomInVariants, reduceMotion)}
        initial="initial"
        animate="animate"
      >
        <h1 className={styles.bingo}>{assisted ? 'NICE TRY!' : 'PUZZLE SOLVED!'}</h1>
        <p className={styles.patterns}>{bonusWordsFound} bonus word{bonusWordsFound === 1 ? '' : 's'} found</p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {bank.label} · {config.difficulty}
        </p>
        <p>
          🧩 Puzzles completed in {bank.label}: <strong>{totalCompleted}</strong>
        </p>
      </div>

      <div className={styles.actions}>
        <motion.button
          className={styles.primaryButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNextPuzzle}
        >
          Next Puzzle
        </motion.button>
        <button className={styles.secondaryButton} onClick={onMenu}>
          Menu
        </button>
      </div>
    </motion.main>
  );
}
