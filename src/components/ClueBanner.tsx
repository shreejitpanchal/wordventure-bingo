import { AnimatePresence, motion } from 'framer-motion';
import type { Clue } from '../types';
import styles from './ClueBanner.module.css';

interface Props {
  clue: Clue | null;
  /** True in the last stretch of the caller timer -- the card heartbeats. */
  urgent?: boolean;
  reduceMotion: boolean;
}

const TYPE_LABEL: Record<Clue['type'], string> = {
  definition: 'Definition',
  synonym: 'Synonym Clue',
  fillBlank: 'Fill in the Blank',
  riddle: 'Riddle',
  anagram: 'Anagram',
};

export default function ClueBanner({ clue, urgent = false, reduceMotion }: Props) {
  return (
    <div className={styles.banner}>
      <AnimatePresence mode="wait">
        {clue && (
          <motion.div
            key={clue.word + clue.type}
            className={`${styles.content} ${urgent && !reduceMotion ? styles.urgent : ''}`}
            // Swoosh sideways (old clue leaves left, new one arrives from the
            // right) so a new call reads as "next!", not a fade in place.
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 60, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -60, rotate: -2 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className={styles.tag}>{TYPE_LABEL[clue.type]}</span>
            <p className={styles.text}>{clue.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
