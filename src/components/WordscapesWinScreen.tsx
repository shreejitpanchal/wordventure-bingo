import { motion } from 'framer-motion';
import type { WordscapesConfig, WordscapesResult, WordscapesStats } from '../types';
import type { ModeWinScreenProps } from '../modes/types';
import { WORD_BANK_LABELS } from '../data/wordBankLabels';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Celebration from './Celebration';
import CountUp from './CountUp';
import styles from './WinScreen.module.css';

type Props = ModeWinScreenProps<WordscapesConfig, WordscapesResult, WordscapesStats>;

const GLYPHS = ['🅰', '🅱', '🆎', '🔤', '🧩', '✨'];

export default function WordscapesWinScreen({ config, result, stats, context, onPlayAgain, onMenu, reduceMotion }: Props) {
  const { bonusWordsFound, assisted } = result;
  const label = WORD_BANK_LABELS[config.category];
  const totalCompleted = stats.puzzlesCompleted[config.category] ?? 0;
  // An unaided solve with bonus words on top is the big one; unaided alone
  // is a regular win; an assisted finish gets the sympathetic owl and no
  // confetti -- it wasn't fully solved unaided, celebrating it the same way
  // as a real win would ring hollow.
  const tier = assisted ? 'none' : bonusWordsFound >= 2 ? 'big' : 'small';

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
        <h1 className={styles.bingo}>{assisted ? 'NICE TRY!' : 'PUZZLE SOLVED!'}</h1>
        <p className={styles.patterns}>
          <CountUp value={bonusWordsFound} reduceMotion={reduceMotion} /> bonus word{bonusWordsFound === 1 ? '' : 's'} found
        </p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {label} · {config.difficulty}
        </p>
        <p>
          🧩 Puzzles completed in {label}:{' '}
          <strong>
            <CountUp value={totalCompleted} reduceMotion={reduceMotion} />
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
          Next Puzzle
        </motion.button>
        <button className={styles.secondaryButton} onClick={onMenu}>
          Menu
        </button>
      </div>
    </motion.main>
  );
}
