import type { Variants } from 'framer-motion';

/** PowerPoint-style slide+fade used for whole-screen transitions. */
export const screenVariants: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

/** Zoom-in entrance for the win celebration. */
export const zoomInVariants: Variants = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

/**
 * Collapses any animation to an instant snap when reduced motion is on --
 * keeps each variant's real target values (opacity/x/scale) so the element
 * still ends up fully visible in the right place, just without the tween.
 */
export function withReducedMotion(variants: Variants, reduceMotion: boolean): Variants {
  if (!reduceMotion) return variants;
  const instant = (variant: Variants[string] | undefined) => {
    if (typeof variant !== 'object' || variant === null) return variant;
    return { ...variant, transition: { duration: 0 } };
  };
  return {
    initial: instant(variants.initial),
    animate: instant(variants.animate),
    exit: instant(variants.exit),
  };
}
