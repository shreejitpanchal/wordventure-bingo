import { motion } from 'framer-motion';
import type { SynonymSafariConfig, SynonymSafariResult, SynonymSafariStats } from '../types';
import type { ModeWinScreenProps } from '../modes/types';
import { SYNONYM_SAFARI_LABELS } from '../data/synonymSafariLabels';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Confetti from './Confetti';
import styles from './WinScreen.module.css';

type Props = ModeWinScreenProps<SynonymSafariConfig, SynonymSafariResult, SynonymSafariStats>;

export default function SynonymSafariWinScreen({ config, result, stats, onPlayAgain, onMenu, reduceMotion }: Props) {
  const { pairsMatched, assisted } = result;
  const label = SYNONYM_SAFARI_LABELS[config.category];
  const roundsCompleted = stats.roundsCompleted[config.category] ?? 0;

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* No confetti for an assisted round -- it wasn't fully matched
          unaided, celebrating it the same way as a real win would ring hollow. */}
      {!assisted && <Confetti reduceMotion={reduceMotion} />}

      <motion.div
        className={styles.banner}
        variants={withReducedMotion(zoomInVariants, reduceMotion)}
        initial="initial"
        animate="animate"
      >
        <h1 className={styles.bingo}>{assisted ? 'NICE TRY!' : 'ALL MATCHED!'}</h1>
        <p className={styles.patterns}>{pairsMatched} pair{pairsMatched === 1 ? '' : 's'} matched</p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {label} · {config.difficulty}
        </p>
        <p>
          🔗 Rounds completed in {label}: <strong>{roundsCompleted}</strong>
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
