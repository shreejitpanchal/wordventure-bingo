import { useState } from 'react';
import { motion } from 'framer-motion';
import type { SoundPlayer } from '../lib/sound';
import { screenVariants, withReducedMotion } from '../lib/motion';
import Mascot from './Mascot';
import styles from './ProfileScreen.module.css';

/** The avatar choices. Emoji, not images, like everything else here. */
export const AVATARS = ['🦊', '🐼', '🦄', '🐸', '🐯', '🐙', '🦋', '🐢', '🦖', '🐧', '🐝', '🚀'] as const;
export const DEFAULT_AVATAR = '👋';

interface Props {
  profiles: string[];
  /** Emoji per profile name; a name with none shows DEFAULT_AVATAR. */
  avatars: Record<string, string>;
  /** Present only when this screen was reached by choice (switching profile
   * from the menu), not on a forced first-launch pick. */
  onCancel?: () => void;
  /** `avatar` is set when a new name was typed (the picker was shown). */
  onChoose: (name: string, avatar?: string) => void;
  sound: SoundPlayer;
  reduceMotion: boolean;
}

export default function ProfileScreen({ profiles, avatars, onCancel, onChoose, sound, reduceMotion }: Props) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);

  function submitNewName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    sound.play('select');
    onChoose(trimmed, avatar);
  }

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {onCancel && (
        <button className={styles.backButton} onClick={onCancel} aria-label="Back">
          ← Back
        </button>
      )}

      <Mascot mood="happy" reduceMotion={reduceMotion} size="lg" />
      <h1 className={styles.title}>Who's playing?</h1>

      {profiles.length > 0 && (
        <div className={styles.grid}>
          {profiles.map((p) => (
            <motion.button
              key={p}
              className={styles.chip}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              onClick={() => {
                sound.play('select');
                onChoose(p);
              }}
            >
              <span className={styles.chipAvatar} aria-hidden="true">
                {avatars[p] ?? DEFAULT_AVATAR}
              </span>
              {p}
            </motion.button>
          ))}
        </div>
      )}

      <p className={styles.subtitle}>
        {profiles.length > 0 ? 'or add a new player' : "What's your name?"}
      </p>
      <div className={styles.form}>
        <input
          className={styles.input}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitNewName()}
          maxLength={20}
        />
        <motion.button
          className={styles.addButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={submitNewName}
        >
          {profiles.length > 0 ? 'Add' : "Let's play!"}
        </motion.button>
      </div>

      <p className={styles.avatarLabel}>Pick your avatar</p>
      <div className={styles.avatarGrid} role="radiogroup" aria-label="Avatar">
        {AVATARS.map((a) => (
          <motion.button
            key={a}
            type="button"
            role="radio"
            aria-checked={avatar === a}
            aria-label={`Avatar ${a}`}
            className={`${styles.avatarChip} ${avatar === a ? styles.avatarChipActive : ''}`}
            animate={avatar === a && !reduceMotion ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            onClick={() => {
              sound.play('tap');
              setAvatar(a);
            }}
          >
            {a}
          </motion.button>
        ))}
      </div>
    </motion.main>
  );
}
