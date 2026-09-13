/** Deterministic RNG helper for tests: cycles through fixed [0,1) values. */
export function sequenceRng(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

/** Simple seeded PRNG (mulberry32) for tests that need many varied values. */
export function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
