import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GameMode } from '../types';
import type { ModeStatsRecord } from '../modes/types';
import type { SoundPlayer } from '../lib/sound';
import { computeBadges, computeLevel } from '../modes/badges';
import { screenVariants, withReducedMotion } from '../lib/motion';
import LevelBar from './LevelBar';
import Mascot from './Mascot';
import styles from './TrophyScreen.module.css';

interface Props {
  playerName: string;
  statsByMode: Record<GameMode, ModeStatsRecord>;
  sound: SoundPlayer;
  onClose: () => void;
  reduceMotion: boolean;
}

/**
 * The Trophy Room: every badge, earned ones shiny, locked ones grey and
 * wobbling when tapped (so a tap still *does* something and shows the
 * unlock hint). Everything here is derived from statsByMode -- see
 * src/modes/badges.ts -- nothing is stored.
 */
export default function TrophyScreen({ playerName, statsByMode, sound, onClose, reduceMotion }: Props) {
  const badges = computeBadges(statsByMode);
  const level = computeLevel(statsByMode);
  const earnedCount = badges.filter((b) => b.earned).length;
  const [wobbling, setWobbling] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);

  function tapBadge(id: string, earned: boolean) {
    setRevealed((prev) => (prev === id ? null : id));
    if (earned) {
      sound.play('select');
    } else {
      sound.play('tap');
      setWobbling(id);
      window.setTimeout(() => setWobbling((w) => (w === id ? null : w)), 500);
    }
  }

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.topBar}>
        <button className={styles.backButton} onClick={onClose} aria-label="Back">
          ← Back
        </button>
        <h1 className={styles.title}>🏆 Trophy Room</h1>
      </div>

      <div className={styles.hero}>
        <Mascot mood={earnedCount > 0 ? 'happy' : 'think'} reduceMotion={reduceMotion} size="md" />
        <div className={styles.heroText}>
          <p className={styles.heroName}>{playerName}</p>
          <p className={styles.heroCount}>
            {earnedCount} / {badges.length} badges earned
          </p>
        </div>
      </div>

      <LevelBar level={level} reduceMotion={reduceMotion} />

      <ul className={styles.grid}>
        {badges.map((badge, i) => {
          const isRevealed = revealed === badge.id;
          return (
            <motion.li
              key={badge.id}
              className={`${styles.badge} ${badge.earned ? styles.earned : styles.locked}`}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.9 }}
              animate={
                wobbling === badge.id && !reduceMotion
                  ? { opacity: 1, y: 0, scale: 1, rotate: [0, -8, 8, -6, 6, 0] }
                  : { opacity: 1, y: 0, scale: 1, rotate: 0 }
              }
              transition={
                wobbling === badge.id
                  ? { duration: 0.5 }
                  : reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 260, damping: 20, delay: i * 0.04 }
              }
            >
              <button type="button" className={styles.badgeButton} onClick={() => tapBadge(badge.id, badge.earned)}>
                <span className={styles.badgeEmoji} aria-hidden="true">
                  {badge.earned ? badge.emoji : '🔒'}
                </span>
                <span className={styles.badgeTitle}>{badge.title}</span>
                {badge.earned && !reduceMotion && <span className={styles.shine} aria-hidden="true" />}
              </button>
              {isRevealed && <p className={styles.badgeDescription}>{badge.description}</p>}
            </motion.li>
          );
        })}
      </ul>
    </motion.main>
  );
}
