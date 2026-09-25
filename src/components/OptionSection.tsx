import { motion } from 'framer-motion';
import type { SoundPlayer } from '../lib/sound';
import styles from './OptionSection.module.css';

export interface Option<T extends string | number> {
  id: T;
  label: string;
  /** Shown before the label -- gives every category chip a face. */
  emoji?: string;
}

interface Props<T extends string | number> {
  title: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Plays a tap blip on select when provided. */
  sound?: SoundPlayer;
  reduceMotion?: boolean;
}

// A quick jelly squash when a chip becomes selected -- kid-scale feedback
// that the tap landed. Framer only re-runs this when the target changes,
// so an already-active chip doesn't re-bounce on unrelated re-renders.
const JELLY = { scale: [1, 1.14, 0.94, 1.04, 1] };

/**
 * One titled group of single-select chips -- the building block every menu
 * section (mode, category, difficulty, and each mode's own extra options)
 * is made of, so all of them share one grid/alignment implementation
 * instead of each mode re-rolling its own chip markup.
 */
export default function OptionSection<T extends string | number>({
  title,
  options,
  value,
  onChange,
  sound,
  reduceMotion = false,
}: Props<T>) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.grid} role="group" aria-label={title}>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <motion.button
              key={o.id}
              type="button"
              className={`${styles.chip} ${active ? styles.chipActive : ''}`}
              aria-pressed={active}
              animate={active && !reduceMotion ? JELLY : { scale: 1 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              onClick={() => {
                if (!active) sound?.play('tap');
                onChange(o.id);
              }}
            >
              {o.emoji && (
                <span className={styles.chipEmoji} aria-hidden="true">
                  {o.emoji}
                </span>
              )}
              {o.label}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
