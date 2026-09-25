import { motion } from 'framer-motion';
import type { SentenceQuestConfig, SentenceQuestResult, SentenceQuestStats } from '../types';
import type { ModeWinScreenProps } from '../modes/types';
import { SENTENCE_QUEST_LABELS } from '../data/sentenceQuestLabels';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Confetti from './Confetti';
import styles from './WinScreen.module.css';

type Props = ModeWinScreenProps<SentenceQuestConfig, SentenceQuestResult, SentenceQuestStats>;

// A round doesn't need to be perfect to feel like a win -- 70%+ correct
// gets the celebratory tone/confetti, matching how Wordscapes only skips
// confetti for an assisted (not genuinely solved) puzzle rather than
// demanding perfection.
const PASS_RATIO = 0.7;

export default function SentenceQuestWinScreen({ config, result, stats, onPlayAgain, onMenu, reduceMotion }: Props) {
  const { correctCount, totalCount } = result;
  const label = SENTENCE_QUEST_LABELS[config.category];
  const passed = totalCount > 0 && correctCount / totalCount >= PASS_RATIO;
  const roundsCompleted = stats.roundsCompleted[config.category] ?? 0;

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {passed && <Confetti reduceMotion={reduceMotion} />}

      <motion.div
        className={styles.banner}
        variants={withReducedMotion(zoomInVariants, reduceMotion)}
        initial="initial"
        animate="animate"
      >
        <h1 className={styles.bingo}>{passed ? 'GREAT JOB!' : 'KEEP PRACTICING!'}</h1>
        <p className={styles.patterns}>
          {correctCount} / {totalCount} correct
        </p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {label} · {config.difficulty}
        </p>
        <p>
          📝 Rounds completed in {label}: <strong>{roundsCompleted}</strong>
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
