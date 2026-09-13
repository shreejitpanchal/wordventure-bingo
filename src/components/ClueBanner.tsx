import { AnimatePresence, motion } from 'framer-motion';
import type { Clue } from '../types';
import styles from './ClueBanner.module.css';

interface Props {
  clue: Clue | null;
  reduceMotion: boolean;
}

const TYPE_LABEL: Record<Clue['type'], string> = {
  definition: 'Definition',
  synonym: 'Synonym Clue',
  fillBlank: 'Fill in the Blank',
  riddle: 'Riddle',
  anagram: 'Anagram',
};

export default function ClueBanner({ clue, reduceMotion }: Props) {
  return (
    <div className={styles.banner}>
      <AnimatePresence mode="wait">
        {clue && (
          <motion.div
            key={clue.word + clue.type}
            className={styles.content}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            transition={{ duration: reduceMotion ? 0 : 0.35 }}
          >
            <span className={styles.tag}>{TYPE_LABEL[clue.type]}</span>
            <p className={styles.text}>{clue.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
