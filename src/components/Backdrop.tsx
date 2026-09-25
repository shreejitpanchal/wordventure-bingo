import styles from './Backdrop.module.css';

interface Props {
  reduceMotion: boolean;
}

/**
 * Three big blurred colour blobs drifting slowly behind every screen, tinted
 * from the active mode's palette (theme.css `--color-blob-*`, swapped by
 * useModeTheme) so the whole app visibly changes "world" when a kid picks a
 * mode. Fixed, behind content, ignores pointer events. Pure CSS animation
 * -- no per-frame JS -- and fully static under reduced motion.
 */
export default function Backdrop({ reduceMotion }: Props) {
  const drift = reduceMotion ? '' : styles.drift;
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <span className={`${styles.blob} ${styles.one} ${drift}`} />
      <span className={`${styles.blob} ${styles.two} ${drift}`} />
      <span className={`${styles.blob} ${styles.three} ${drift}`} />
    </div>
  );
}
