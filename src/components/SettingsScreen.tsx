import { motion } from 'framer-motion';
import type {
  FontSize,
  SentenceQuestStats,
  Settings,
  Streaks,
  SynonymSafariStats,
  ThemePreference,
  WordscapesStats,
} from '../types';
import { screenVariants, withReducedMotion } from '../lib/motion';
import WordListEditor from './WordListEditor';
import styles from './SettingsScreen.module.css';

interface Props {
  playerName: string;
  streaks: Streaks;
  wordscapesStats: WordscapesStats;
  sentenceQuestStats: SentenceQuestStats;
  synonymSafariStats: SynonymSafariStats;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  reduceMotion: boolean;
}

/** Sums a per-category Record<string, number> into one overall total --
 * this screen shows an at-a-glance summary across every category, not a
 * category-by-category breakdown (that's what each mode's own MenuScreen
 * streak line and win screen are for). */
function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((total, n) => total + n, 0);
}

function maxValue(record: Record<string, number>): number {
  return Object.values(record).reduce((max, n) => Math.max(max, n), 0);
}

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const FONT_SIZES: { id: FontSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'xlarge', label: 'Extra Large' },
];

export default function SettingsScreen({
  playerName,
  streaks,
  wordscapesStats,
  sentenceQuestStats,
  synonymSafariStats,
  settings,
  onChange,
  onClose,
  reduceMotion,
}: Props) {
  const bingoGamesPlayed = sumValues(streaks.gamesPlayed);
  const bingoWins = sumValues(streaks.wins);
  const bingoBestStreak = maxValue(streaks.bestStreak);
  const puzzlesCompleted = sumValues(wordscapesStats.puzzlesCompleted);
  const bonusWordsFound = sumValues(wordscapesStats.bonusWordsFound);
  const sentenceQuestRounds = sumValues(sentenceQuestStats.roundsCompleted);
  const sentenceQuestCorrect = sumValues(sentenceQuestStats.correctAnswers);
  const synonymSafariRounds = sumValues(synonymSafariStats.roundsCompleted);
  const synonymSafariPairs = sumValues(synonymSafariStats.pairsMatched);

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
        <h1 className={styles.title}>Settings</h1>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🏆 {playerName}'s Stats</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statCardTitle}>🎯 Bingo</p>
            <p className={styles.statLine}>
              Games played <strong>{bingoGamesPlayed}</strong>
            </p>
            <p className={styles.statLine}>
              Wins <strong>{bingoWins}</strong>
            </p>
            <p className={styles.statLine}>
              Best streak <strong>{bingoBestStreak}</strong>
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statCardTitle}>🧩 Wordscapes</p>
            <p className={styles.statLine}>
              Puzzles completed <strong>{puzzlesCompleted}</strong>
            </p>
            <p className={styles.statLine}>
              Bonus words found <strong>{bonusWordsFound}</strong>
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statCardTitle}>📝 Sentence Quest</p>
            <p className={styles.statLine}>
              Rounds completed <strong>{sentenceQuestRounds}</strong>
            </p>
            <p className={styles.statLine}>
              Correct answers <strong>{sentenceQuestCorrect}</strong>
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statCardTitle}>🔗 Synonym Safari</p>
            <p className={styles.statLine}>
              Rounds completed <strong>{synonymSafariRounds}</strong>
            </p>
            <p className={styles.statLine}>
              Pairs matched <strong>{synonymSafariPairs}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <label className={styles.toggleRow}>
          <span>Sound effects</span>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => onChange({ soundEnabled: e.target.checked })}
          />
        </label>
        <label className={styles.toggleRow}>
          <span>Reduce motion</span>
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => onChange({ reduceMotion: e.target.checked })}
          />
        </label>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Theme</h2>
        <div className={styles.chipGroup}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`${styles.chip} ${settings.theme === t.id ? styles.chipActive : ''}`}
              onClick={() => onChange({ theme: t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Font Size</h2>
        <div className={styles.chipGroup}>
          {FONT_SIZES.map((f) => (
            <button
              key={f.id}
              className={`${styles.chip} ${settings.fontSize === f.id ? styles.chipActive : ''}`}
              onClick={() => onChange({ fontSize: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Free Play Word List</h2>
        <p className={styles.hint}>Add your own words for the Free Play category.</p>
        <WordListEditor />
      </section>
    </motion.main>
  );
}
