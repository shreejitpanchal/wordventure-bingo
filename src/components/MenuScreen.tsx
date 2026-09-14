import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CategoryId, Difficulty, GameConfig, GameMode, Streaks, WordscapesConfig, WordscapesStats } from '../types';
import { WORD_BANKS, CATEGORY_ORDER } from '../data/wordBanks';
import { screenVariants, withReducedMotion } from '../lib/motion';
import { DEFAULT_WORD_COUNT, MAX_WORD_COUNT, MIN_WORD_COUNT } from '../lib/wordscapes/gridGeneration';
import { CALL_SECONDS_OPTIONS, DEFAULT_CALL_SECONDS } from '../lib/caller';
import styles from './MenuScreen.module.css';

interface Props {
  playerName: string;
  streaks: Streaks;
  wordscapesStats: WordscapesStats;
  onStartBingo: (config: GameConfig) => void;
  onStartWordscapes: (config: WordscapesConfig) => void;
  onOpenSettings: () => void;
  onSwitchProfile: () => void;
  reduceMotion: boolean;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const MODES: { id: GameMode; label: string; emoji: string }[] = [
  { id: 'bingo', label: 'Bingo', emoji: '🎯' },
  { id: 'wordscapes', label: 'Wordscapes', emoji: '🧩' },
];

export default function MenuScreen({
  playerName,
  streaks,
  wordscapesStats,
  onStartBingo,
  onStartWordscapes,
  onOpenSettings,
  onSwitchProfile,
  reduceMotion,
}: Props) {
  const [mode, setMode] = useState<GameMode>('bingo');
  const [category, setCategory] = useState<CategoryId>('spelling');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [players, setPlayers] = useState<1 | 2>(1);
  const [callSeconds, setCallSeconds] = useState<number>(DEFAULT_CALL_SECONDS);
  const [wordCount, setWordCount] = useState<number>(DEFAULT_WORD_COUNT);

  const bestStreak = streaks.bestStreak[category] ?? 0;
  const puzzlesCompleted = wordscapesStats.puzzlesCompleted[category] ?? 0;

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
      <button className={styles.profileButton} onClick={onSwitchProfile}>
        👋 {playerName}
      </button>

      <h1 className={styles.title}>Wordventure Bingo</h1>
      <p className={styles.subtitle}>Pick a mode, category, and difficulty to start!</p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mode</h2>
        <div className={styles.grid}>
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`${styles.chip} ${mode === m.id ? styles.chipActive : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </section>

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

      {mode === 'bingo' && (
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
      )}

      {mode === 'bingo' && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Call Speed</h2>
          <div className={styles.grid}>
            {CALL_SECONDS_OPTIONS.map((s) => (
              <button
                key={s}
                className={`${styles.chip} ${callSeconds === s ? styles.chipActive : ''}`}
                onClick={() => setCallSeconds(s)}
              >
                {s}s
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'wordscapes' && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Word Count</h2>
          <div className={styles.grid}>
            {Array.from({ length: MAX_WORD_COUNT - MIN_WORD_COUNT + 1 }, (_, i) => MIN_WORD_COUNT + i).map((n) => (
              <button
                key={n}
                className={`${styles.chip} ${wordCount === n ? styles.chipActive : ''}`}
                onClick={() => setWordCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'bingo' && bestStreak > 0 && (
        <p className={styles.streak}>🔥 Best streak in {WORD_BANKS[category].label}: {bestStreak}</p>
      )}
      {mode === 'wordscapes' && puzzlesCompleted > 0 && (
        <p className={styles.streak}>🧩 Puzzles completed in {WORD_BANKS[category].label}: {puzzlesCompleted}</p>
      )}

      <motion.button
        className={styles.startButton}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() =>
          mode === 'bingo'
            ? onStartBingo({ category, difficulty, players, callSeconds })
            : onStartWordscapes({ category, difficulty, wordCount })
        }
      >
        Start Game
      </motion.button>
    </motion.main>
  );
}
