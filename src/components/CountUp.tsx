import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

interface Props {
  value: number;
  reduceMotion: boolean;
  /** seconds */
  duration?: number;
}

/**
 * Rolls a number up from 0 to `value` when it mounts or changes -- the win
 * screens use it so stats feel *earned* rather than just printed. Snaps
 * straight to the value under reduced motion.
 */
export default function CountUp({ value, reduceMotion, duration = 0.9 }: Props) {
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduceMotion, duration]);

  return <>{shown}</>;
}
