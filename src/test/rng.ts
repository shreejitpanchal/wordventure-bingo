/** Deterministic RNG helper for tests: cycles through fixed [0,1) values. */
export function sequenceRng(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

// The seeded PRNG moved to src/lib/random.ts (the daily challenge needs it
// at runtime); re-exported so existing tests keep importing it from here.
export { seededRng } from '../lib/random';
