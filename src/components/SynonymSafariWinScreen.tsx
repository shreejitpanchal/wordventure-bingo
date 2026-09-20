import { motion } from 'framer-motion';
import type { SynonymSafariConfig, SynonymSafariStats } from '../types';
import { SYNONYM_SAFARI_BANKS } from '../data/synonymSafariBanks';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Confetti from './Confetti';
import styles from './WinScreen.module.css';

interface Props {
  config: SynonymSafariConfig;
  pairsMatched: number;
  /** True if the player used the hint button anywhere in this round. */
  assisted: boolean;
  stats: SynonymSafariStats;
  onNextRound: () => void;
  onMenu: () => void;
  reduceMotion: boolean;
}

export default function SynonymSafariWinScreen({
  config,
  pairsMatched,
  assisted,
  stats,
  onNextRound,
  onMenu,
  reduceMotion,
}: Props) {
  const label = SYNONYM_SAFARI_BANKS[config.category].label;
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
          onClick={onNextRound}
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
