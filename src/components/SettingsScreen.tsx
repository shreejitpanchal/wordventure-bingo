import { motion } from 'framer-motion';
import type { FontSize, GameMode, Settings, ThemePreference, WordEntry } from '../types';
import type { ModeStatsRecord } from '../modes/types';
import { MODES } from '../modes';
import { screenVariants, withReducedMotion } from '../lib/motion';
import WordListEditor from './WordListEditor';
import styles from './SettingsScreen.module.css';

interface Props {
  playerName: string;
  /** Read-only: rendered as an at-a-glance summary card per mode. Settings
   * (the persisted object) stays device-wide; only this display is
   * per-profile, fed from App.tsx's already-held state. */
  statsByMode: Record<GameMode, ModeStatsRecord>;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  freeplayWords: WordEntry[];
  onFreeplayWordsChange: (words: WordEntry[]) => void;
  onClose: () => void;
  reduceMotion: boolean;
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
  statsByMode,
  settings,
  onChange,
  freeplayWords,
  onFreeplayWordsChange,
  onClose,
  reduceMotion,
}: Props) {
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
          {/* One card per mode, each an all-category aggregate -- the
              per-category breakdown lives on each mode's own menu line and
              win screen. The lines come from the mode descriptor, so a new
              mode gets its card for free. */}
          {MODES.map((mode) => (
            <div key={mode.id} className={styles.statCard}>
              <p className={styles.statCardTitle}>
                {mode.emoji} {mode.label}
              </p>
              {mode.stats.summary(statsByMode[mode.id]).map((line) => (
                <p key={line.label} className={styles.statLine}>
                  {line.label} <strong>{line.value}</strong>
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
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
              aria-pressed={settings.theme === t.id}
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
              aria-pressed={settings.fontSize === f.id}
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
        <WordListEditor words={freeplayWords} onChange={onFreeplayWordsChange} />
      </section>
    </motion.main>
  );
}
