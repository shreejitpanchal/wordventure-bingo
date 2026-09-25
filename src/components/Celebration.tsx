import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { SoundPlayer } from '../lib/sound';
import Confetti from './Confetti';
import Mascot from './Mascot';
import styles from './Celebration.module.css';

export type CelebrationTier = 'none' | 'small' | 'big';

export interface Milestone {
  emoji: string;
  title: string;
  subtitle?: string;
}

interface Props {
  tier: CelebrationTier;
  /** Mode-flavoured confetti glyphs; omitted = coloured rectangles. */
  glyphs?: string[];
  /** Big-tier banner text; defaults to "★ AMAZING! ★". */
  headline?: string;
  /** Streak/level toast shown after the confetti starts, e.g. "5 in a row!" */
  milestone?: Milestone | null;
  reduceMotion: boolean;
  sound: SoundPlayer;
}

/**
 * One celebration component for every win screen so tiers stay consistent
 * across modes: 'small' is confetti + the cheering owl, 'big' adds a
 * firework burst and a bouncing headline banner, 'none' (an assisted or
 * failed round) just shows a sympathetic owl. Plays the matching fanfare
 * once on mount.
 */
export default function Celebration({ tier, glyphs, headline = '★ AMAZING! ★', milestone, reduceMotion, sound }: Props) {
  useEffect(() => {
    if (tier === 'big') sound.play('bigWin');
    else if (tier === 'small') sound.play('win');
    // Intentionally mount-only: the fanfare belongs to arriving on the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {tier !== 'none' && <Confetti reduceMotion={reduceMotion} tier={tier === 'big' ? 'big' : 'small'} glyphs={glyphs} />}

      <div className={styles.mascotRow}>
        <Mascot mood={tier === 'none' ? 'sad' : 'happy'} reduceMotion={reduceMotion} size="lg" />
      </div>

      {tier === 'big' && (
        <motion.div
          className={styles.headline}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.4, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}
        >
          {headline}
        </motion.div>
      )}

      {milestone && (
        <motion.div
          className={styles.milestone}
          role="status"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 18, delay: 0.7 }}
        >
          <motion.span
            className={styles.milestoneEmoji}
            animate={reduceMotion ? undefined : { rotate: [0, -12, 12, -8, 8, 0] }}
            transition={{ duration: 0.9, delay: 1.0 }}
          >
            {milestone.emoji}
          </motion.span>
          <div>
            <p className={styles.milestoneTitle}>{milestone.title}</p>
            {milestone.subtitle && <p className={styles.milestoneSubtitle}>{milestone.subtitle}</p>}
          </div>
        </motion.div>
      )}
    </>
  );
}
