import { useState } from 'react';
import { motion } from 'framer-motion';
import { screenVariants, withReducedMotion } from '../lib/motion';
import styles from './ProfileScreen.module.css';

interface Props {
  profiles: string[];
  /** Present only when this screen was reached by choice (switching profile
   * from the menu), not on a forced first-launch pick. */
  onCancel?: () => void;
  onChoose: (name: string) => void;
  reduceMotion: boolean;
}

export default function ProfileScreen({ profiles, onCancel, onChoose, reduceMotion }: Props) {
  const [name, setName] = useState('');

  function submitNewName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChoose(trimmed);
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

      <h1 className={styles.title}>Who's playing?</h1>

      {profiles.length > 0 && (
        <div className={styles.grid}>
          {profiles.map((p) => (
            <button key={p} className={styles.chip} onClick={() => onChoose(p)}>
              {p}
            </button>
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
    </motion.main>
  );
}
