import styles from './OptionSection.module.css';

export interface Option<T extends string | number> {
  id: T;
  label: string;
}

interface Props<T extends string | number> {
  title: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (id: T) => void;
}

/**
 * One titled group of single-select chips -- the building block every menu
 * section (mode, category, difficulty, and each mode's own extra options)
 * is made of, so all of them share one grid/alignment implementation
 * instead of each mode re-rolling its own chip markup.
 */
export default function OptionSection<T extends string | number>({ title, options, value, onChange }: Props<T>) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.grid} role="group" aria-label={title}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`${styles.chip} ${value === o.id ? styles.chipActive : ''}`}
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}
