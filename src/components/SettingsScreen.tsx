import { motion } from 'framer-motion';
import type { FontSize, Settings, ThemePreference } from '../types';
import { screenVariants, withReducedMotion } from '../lib/motion';
import WordListEditor from './WordListEditor';
import styles from './SettingsScreen.module.css';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
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

export default function SettingsScreen({ settings, onChange, onClose, reduceMotion }: Props) {
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
