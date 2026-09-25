import { motion } from 'framer-motion';
import type { WordscapesConfig, WordscapesResult, WordscapesStats } from '../types';
import type { ModeWinScreenProps } from '../modes/types';
import { WORD_BANK_LABELS } from '../data/wordBankLabels';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Confetti from './Confetti';
import styles from './WinScreen.module.css';

type Props = ModeWinScreenProps<WordscapesConfig, WordscapesResult, WordscapesStats>;

export default function WordscapesWinScreen({ config, result, stats, onPlayAgain, onMenu, reduceMotion }: Props) {
  const { bonusWordsFound, assisted } = result;
  const label = WORD_BANK_LABELS[config.category];
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
          {label} · {config.difficulty}
        </p>
        <p>
          🧩 Puzzles completed in {label}: <strong>{totalCompleted}</strong>
        </p>
      </div>

      <div className={styles.actions}>
        <motion.button
          className={styles.primaryButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
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
