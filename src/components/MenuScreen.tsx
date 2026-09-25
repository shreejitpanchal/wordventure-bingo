import { motion } from 'framer-motion';
import type { DailyRecord, Difficulty, GameMode } from '../types';
import type { AnyMode, MenuSelection, ModeConfigBase, ModeStatsRecord } from '../modes/types';
import type { DailyChallenge } from '../modes/daily';
import type { SoundPlayer } from '../lib/sound';
import { MODES, modeById } from '../modes';
import { computeLevel } from '../modes/badges';
import { screenVariants, withReducedMotion } from '../lib/motion';
import { useIdle } from '../hooks/useIdle';
import OptionSection from './OptionSection';
import Mascot, { type MascotMood } from './Mascot';
import LevelBar from './LevelBar';
import DailyCard from './DailyCard';
import styles from './MenuScreen.module.css';

interface Props {
  playerName: string;
  avatar: string;
  statsByMode: Record<GameMode, ModeStatsRecord>;
  /** Controlled: every pick reports up through onSelectionChange and App.tsx
   * persists it per profile, which is what makes the menu come back to the
   * same setup after a game (this screen unmounts in between) and after a
   * restart. */
  selection: MenuSelection;
  onSelectionChange: (selection: MenuSelection) => void;
  daily: {
    challenge: DailyChallenge;
    record: DailyRecord;
    doneToday: boolean;
    streakAlive: boolean;
  };
  sound: SoundPlayer;
  onStart: (mode: AnyMode, config: ModeConfigBase) => void;
  onStartDaily: () => void;
  onOpenTrophies: () => void;
  onOpenSettings: () => void;
  onSwitchProfile: () => void;
  reduceMotion: boolean;
}

const DIFFICULTIES: { id: Difficulty; label: string; emoji: string }[] = [
  { id: 'easy', label: 'Easy', emoji: '🌱' },
  { id: 'medium', label: 'Medium', emoji: '🌿' },
  { id: 'hard', label: 'Hard', emoji: '🌳' },
];

const MODE_OPTIONS = MODES.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji }));

// Idle nudges: after NUDGE_MS the Start button breathes and the owl points
// at it; after DOZE_MS the owl dozes off. Both reset on any tap/key.
const NUDGE_MS = 12_000;
const DOZE_MS = 40_000;

/**
 * Mode selection lives here, not on a separate screen. Everything
 * mode-specific (categories, extra options, the progress line) comes from
 * the mode's descriptor (src/modes/), so this component is the same for
 * one mode or ten.
 */
export default function MenuScreen({
  playerName,
  avatar,
  statsByMode,
  selection,
  onSelectionChange,
  daily,
  sound,
  onStart,
  onStartDaily,
  onOpenTrophies,
  onOpenSettings,
  onSwitchProfile,
  reduceMotion,
}: Props) {
  const { modeId, difficulty, configs } = selection;
  const mode = modeById(modeId);
  const config = configs[modeId];
  const stats = statsByMode[modeId];
  const statLine = mode.menuStatLine(config, stats);
  const level = computeLevel(statsByMode);

  const nudge = useIdle(NUDGE_MS);
  const doze = useIdle(DOZE_MS);
  const mascotMood: MascotMood = doze ? 'sleepy' : nudge ? 'point' : 'idle';

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
      <div className={styles.cornerRight}>
        <button className={styles.iconButton} onClick={onOpenTrophies} aria-label="Trophy Room">
          🏆
        </button>
        <button className={styles.iconButton} onClick={onOpenSettings} aria-label="Settings">
          ⚙️
        </button>
      </div>
      <button className={styles.profileButton} onClick={onSwitchProfile}>
        <span aria-hidden="true">{avatar}</span> {playerName}
      </button>

      <div className={styles.hero}>
        <Mascot mood={mascotMood} reduceMotion={reduceMotion} size="md" />
        <div>
          <h1 className={styles.title}>Wordventure Bingo</h1>
          <p className={styles.subtitle}>Pick a mode, category, and difficulty to start!</p>
        </div>
      </div>

      <LevelBar level={level} reduceMotion={reduceMotion} />

      <DailyCard
        challenge={daily.challenge}
        record={daily.record}
        doneToday={daily.doneToday}
        streakAlive={daily.streakAlive}
        onPlay={onStartDaily}
        reduceMotion={reduceMotion}
      />

      <OptionSection
        title="Mode"
        options={MODE_OPTIONS}
        value={modeId}
        onChange={(nextModeId) => onSelectionChange({ ...selection, modeId: nextModeId })}
        sound={sound}
        reduceMotion={reduceMotion}
      />

      <OptionSection
        title="Category"
        options={mode.categories}
        value={config.category}
        onChange={(category) => updateConfig({ ...config, category })}
        sound={sound}
        reduceMotion={reduceMotion}
      />

      <OptionSection
        title="Difficulty"
        options={DIFFICULTIES}
        value={difficulty}
        onChange={(nextDifficulty) => onSelectionChange({ ...selection, difficulty: nextDifficulty })}
        sound={sound}
        reduceMotion={reduceMotion}
      />

      <mode.MenuOptions config={config} stats={stats} sound={sound} reduceMotion={reduceMotion} onChange={updateConfig} />

      {statLine && <p className={styles.streak}>{statLine}</p>}

      <motion.button
        className={`${styles.startButton} ${nudge && !reduceMotion ? styles.startPulse : ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          sound.play('select');
          onStart(mode, { ...config, difficulty });
        }}
      >
        Start Game
      </motion.button>
    </motion.main>
  );
}
