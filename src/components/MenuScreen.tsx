import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CategoryId, Difficulty, GameConfig, Streaks } from '../types';
import { WORD_BANKS, CATEGORY_ORDER } from '../data/wordBanks';
import { screenVariants, withReducedMotion } from '../lib/motion';
import styles from './MenuScreen.module.css';

interface Props {
  streaks: Streaks;
  onStart: (config: GameConfig) => void;
  onOpenSettings: () => void;
  reduceMotion: boolean;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export default function MenuScreen({ streaks, onStart, onOpenSettings, reduceMotion }: Props) {
  const [category, setCategory] = useState<CategoryId>('spelling');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [players, setPlayers] = useState<1 | 2>(1);

  const bestStreak = streaks.bestStreak[category] ?? 0;

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <button className={styles.settingsButton} onClick={onOpenSettings} aria-label="Settings">
        ⚙️
      </button>

      <h1 className={styles.title}>Wordventure Bingo</h1>
      <p className={styles.subtitle}>Pick a category and difficulty to start!</p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Category</h2>
        <div className={styles.grid}>
          {CATEGORY_ORDER.map((id) => (
            <button
              key={id}
              className={`${styles.chip} ${category === id ? styles.chipActive : ''}`}
              onClick={() => setCategory(id)}
            >
              {WORD_BANKS[id].label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Difficulty</h2>
        <div className={styles.grid}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              className={`${styles.chip} ${difficulty === d.id ? styles.chipActive : ''}`}
              onClick={() => setDifficulty(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Players</h2>
        <div className={styles.grid}>
          <button className={`${styles.chip} ${players === 1 ? styles.chipActive : ''}`} onClick={() => setPlayers(1)}>
            Solo vs. Computer
          </button>
          <button className={`${styles.chip} ${players === 2 ? styles.chipActive : ''}`} onClick={() => setPlayers(2)}>
            Pass & Play (2)
          </button>
        </div>
      </section>

      {bestStreak > 0 && <p className={styles.streak}>🔥 Best streak in {WORD_BANKS[category].label}: {bestStreak}</p>}

      <motion.button
        className={styles.startButton}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onStart({ category, difficulty, players })}
      >
        Start Game
      </motion.button>
    </motion.main>
  );
}
