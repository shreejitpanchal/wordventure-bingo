import { motion } from 'framer-motion';
import type { WordScrambleConfig, WordScrambleResult, WordScrambleStats } from '../types';
import type { ModeWinScreenProps } from '../modes/types';
import { WORD_BANK_LABELS } from '../data/wordBankLabels';
import { MAX_SCRAMBLE_WORDS } from '../lib/wordScramble';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Celebration from './Celebration';
import CountUp from './CountUp';
import styles from './WinScreen.module.css';

type Props = ModeWinScreenProps<WordScrambleConfig, WordScrambleResult, WordScrambleStats>;

const GLYPHS = ['🔀', '🔤', '✨', '🎉', '⭐'];

export default function WordScrambleWinScreen({ config, result, stats, context, onPlayAgain, onMenu, reduceMotion }: Props) {
  const { wordsSolved, totalCount, assisted } = result;
  const label = WORD_BANK_LABELS[config.category];
  const roundsCompleted = stats.roundsCompleted[config.category] ?? 0;
  // Unaided at the largest round size is the big one; unaided otherwise is a
  // regular win; any hint or skip gets no confetti (same as Wordscapes).
  const tier = assisted ? 'none' : totalCount >= MAX_SCRAMBLE_WORDS ? 'big' : 'small';

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Celebration tier={tier} glyphs={GLYPHS} headline="★ WORD WIZARD! ★" reduceMotion={reduceMotion} sound={context.sound} />

      <motion.div
        className={styles.banner}
        variants={withReducedMotion(zoomInVariants, reduceMotion)}
        initial="initial"
        animate="animate"
      >
        <h1 className={styles.bingo}>{assisted ? 'NICE TRY!' : 'UNSCRAMBLED!'}</h1>
        <p className={styles.patterns}>
          <CountUp value={wordsSolved} reduceMotion={reduceMotion} /> of {totalCount} word{totalCount === 1 ? '' : 's'} solved
        </p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {label} · {config.difficulty}
        </p>
        <p>
          🔀 Rounds completed in {label}:{' '}
          <strong>
            <CountUp value={roundsCompleted} reduceMotion={reduceMotion} />
          </strong>
        </p>
      </div>

      <div className={styles.actions}>
        <motion.button
          className={styles.primaryButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
        >
          Next Round
        </motion.button>
        <button className={styles.secondaryButton} onClick={onMenu}>
          Menu
        </button>
      </div>
    </motion.main>
  );
}
