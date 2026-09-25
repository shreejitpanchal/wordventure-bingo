import type { ReactNode } from 'react';
import styles from './Mascot.module.css';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'sleepy' | 'point' | 'think';

interface Props {
  mood: MascotMood;
  reduceMotion: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Optional speech bubble beside the mascot. */
  bubble?: ReactNode;
  className?: string;
}

const MOOD_CLASS: Record<MascotMood, string> = {
  idle: styles.idle,
  happy: styles.happy,
  sad: styles.sad,
  sleepy: styles.sleepy,
  point: styles.point,
  think: styles.think,
};

/**
 * The app's mascot: an owl (it's a word game) built from emoji + CSS
 * keyframes, keeping the "no image assets" convention. Moods are pure
 * presentation -- the caller decides when the owl cheers, droops or dozes.
 * Under reduced motion every mood is a static pose.
 */
export default function Mascot({ mood, reduceMotion, size = 'md', bubble, className }: Props) {
  const sizeClass = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : styles.md;
  return (
    <div className={`${styles.mascot} ${sizeClass} ${className ?? ''}`}>
      <div className={styles.stage}>
        <span
          className={`${styles.owl} ${MOOD_CLASS[mood]} ${reduceMotion ? styles.still : ''}`}
          role="img"
          aria-label="Owl mascot"
        >
          🦉
        </span>
        {mood === 'sleepy' && (
          <span className={`${styles.zzz} ${reduceMotion ? '' : styles.zzzFloat}`} aria-hidden="true">
            💤
          </span>
        )}
        {mood === 'point' && (
          <span className={`${styles.pointer} ${reduceMotion ? '' : styles.pointerBob}`} aria-hidden="true">
            👇
          </span>
        )}
        {mood === 'happy' && (
          <span className={`${styles.sparkle} ${reduceMotion ? '' : styles.sparkleSpin}`} aria-hidden="true">
            ✨
          </span>
        )}
        {mood === 'think' && (
          <span className={styles.zzz} aria-hidden="true">
            🤔
          </span>
        )}
      </div>
      {bubble && <div className={styles.bubble}>{bubble}</div>}
    </div>
  );
}
