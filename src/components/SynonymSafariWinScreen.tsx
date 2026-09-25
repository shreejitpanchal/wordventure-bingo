import { motion } from 'framer-motion';
import type { SynonymSafariConfig, SynonymSafariResult, SynonymSafariStats } from '../types';
import type { ModeWinScreenProps } from '../modes/types';
import { SYNONYM_SAFARI_LABELS } from '../data/synonymSafariLabels';
import { MAX_PAIR_COUNT } from '../lib/synonymSafari';
import { screenVariants, zoomInVariants, withReducedMotion } from '../lib/motion';
import Celebration from './Celebration';
import CountUp from './CountUp';
import styles from './WinScreen.module.css';

type Props = ModeWinScreenProps<SynonymSafariConfig, SynonymSafariResult, SynonymSafariStats>;

const GLYPHS = ['🦁', '🦒', '🐘', '🌿', '✨'];

export default function SynonymSafariWinScreen({ config, result, stats, context, onPlayAgain, onMenu, reduceMotion }: Props) {
  const { pairsMatched, assisted } = result;
  const label = SYNONYM_SAFARI_LABELS[config.category];
  const roundsCompleted = stats.roundsCompleted[config.category] ?? 0;
  // Unaided at the largest round size is the big one; unaided otherwise is a
  // regular win; assisted gets no confetti (same reasoning as Wordscapes).
  const tier = assisted ? 'none' : pairsMatched >= MAX_PAIR_COUNT ? 'big' : 'small';

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Celebration tier={tier} glyphs={GLYPHS} headline="★ SAFARI STAR! ★" reduceMotion={reduceMotion} sound={context.sound} />

      <motion.div
        className={styles.banner}
        variants={withReducedMotion(zoomInVariants, reduceMotion)}
        initial="initial"
        animate="animate"
      >
        <h1 className={styles.bingo}>{assisted ? 'NICE TRY!' : 'ALL MATCHED!'}</h1>
        <p className={styles.patterns}>
          <CountUp value={pairsMatched} reduceMotion={reduceMotion} /> pair{pairsMatched === 1 ? '' : 's'} matched
        </p>
      </motion.div>

      <div className={styles.stats}>
        <p>
          {label} · {config.difficulty}
        </p>
        <p>
          🔗 Rounds completed in {label}:{' '}
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
