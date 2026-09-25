import { motion } from 'framer-motion';
import type { Difficulty, GameMode } from '../types';
import type { AnyMode, MenuSelection, ModeConfigBase, ModeStatsRecord } from '../modes/types';
import { MODES, modeById } from '../modes';
import { screenVariants, withReducedMotion } from '../lib/motion';
import OptionSection from './OptionSection';
import styles from './MenuScreen.module.css';

interface Props {
  playerName: string;
  statsByMode: Record<GameMode, ModeStatsRecord>;
  /** Controlled: every pick reports up through onSelectionChange and App.tsx
   * persists it per profile, which is what makes the menu come back to the
   * same setup after a game (this screen unmounts in between) and after a
   * restart. */
  selection: MenuSelection;
  onSelectionChange: (selection: MenuSelection) => void;
  onStart: (mode: AnyMode, config: ModeConfigBase) => void;
  onOpenSettings: () => void;
  onSwitchProfile: () => void;
  reduceMotion: boolean;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const MODE_OPTIONS = MODES.map((m) => ({ id: m.id, label: `${m.emoji} ${m.label}` }));

/**
 * Mode selection lives here, not on a separate screen. Everything
 * mode-specific (categories, extra options, the progress line) comes from
 * the mode's descriptor (src/modes/), so this component is the same for
 * one mode or ten.
 */
export default function MenuScreen({
  playerName,
  statsByMode,
  selection,
  onSelectionChange,
  onStart,
  onOpenSettings,
  onSwitchProfile,
  reduceMotion,
}: Props) {
  const { modeId, difficulty, configs } = selection;
  const mode = modeById(modeId);
  const config = configs[modeId];
  const stats = statsByMode[modeId];
  const statLine = mode.menuStatLine(config, stats);

  // Difficulty is shared across modes on purpose (a kid who plays on Easy
  // plays everything on Easy), so it's held once at the top level and
  // merged into the chosen mode's config at start time.
  function updateConfig(next: ModeConfigBase) {
    onSelectionChange({ ...selection, configs: { ...configs, [modeId]: next } });
  }

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

      <OptionSection
        title="Mode"
        options={MODE_OPTIONS}
        value={modeId}
        onChange={(nextModeId) => onSelectionChange({ ...selection, modeId: nextModeId })}
      />

      <OptionSection
        title="Category"
        options={mode.categories}
        value={config.category}
        onChange={(category) => updateConfig({ ...config, category })}
      />

      <OptionSection
        title="Difficulty"
        options={DIFFICULTIES}
        value={difficulty}
        onChange={(nextDifficulty) => onSelectionChange({ ...selection, difficulty: nextDifficulty })}
      />

      <mode.MenuOptions config={config} stats={stats} onChange={updateConfig} />

      {statLine && <p className={styles.streak}>{statLine}</p>}

      <motion.button
        className={styles.startButton}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onStart(mode, { ...config, difficulty })}
      >
        Start Game
      </motion.button>
    </motion.main>
  );
}
