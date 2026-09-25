import { motion } from 'framer-motion';
import type { DailyRecord } from '../types';
import type { DailyChallenge } from '../modes/daily';
import styles from './DailyCard.module.css';

interface Props {
  challenge: DailyChallenge;
  record: DailyRecord;
  doneToday: boolean;
  streakAlive: boolean;
  onPlay: () => void;
  reduceMotion: boolean;
}

/** The menu's "Today's Challenge" card: what today's fixed setup is, the
 * days-in-a-row flame, and a Play button (or a done tick). */
export default function DailyCard({ challenge, record, doneToday, streakAlive, onPlay, reduceMotion }: Props) {
  const categoryLabel = challenge.mode.categories.find((c) => c.id === challenge.config.category)?.label ?? '';
  const streak = streakAlive ? record.streak : 0;

  return (
    <section className={styles.card} aria-label="Today's challenge">
      <div className={styles.header}>
        <span className={styles.kicker}>📅 Today's Challenge</span>
        {streak > 0 && (
          <motion.span
            className={styles.flame}
            animate={reduceMotion ? undefined : { scale: [1, 1.15, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            🔥 {streak} day{streak === 1 ? '' : 's'}
          </motion.span>
        )}
      </div>
      <p className={styles.setup}>
        <span className={styles.modeEmoji} aria-hidden="true">
          {challenge.mode.emoji}
        </span>
        <strong>{challenge.mode.label}</strong> · {categoryLabel} · {challenge.config.difficulty}
      </p>
      {doneToday ? (
        <p className={styles.done}>✅ Done for today! Come back tomorrow.</p>
      ) : (
        <motion.button
          type="button"
          className={styles.playButton}
          whileHover={reduceMotion ? undefined : { scale: 1.04 }}
          whileTap={reduceMotion ? undefined : { scale: 0.95 }}
          onClick={onPlay}
        >
          Play Today's Challenge
        </motion.button>
      )}
    </section>
  );
}
