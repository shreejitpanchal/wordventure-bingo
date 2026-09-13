import type { Clue, ClueType, Difficulty, WordEntry } from '../types';

/**
 * Anagram is never authored -- it's always derivable from the word itself,
 * which keeps the word-bank JSON small while still giving every single word
 * a puzzle-layer option (spec: "occasional riddles or anagrams").
 */
export function makeAnagram(word: string, rng: () => number = Math.random): string {
  const letters = word.split('');
  for (let attempt = 0; attempt < 8; attempt++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const shuffled = letters.join('');
    if (shuffled !== word || word.length <= 2) return shuffled;
  }
  return letters.join('');
}

export function availableClueTypes(entry: WordEntry): ClueType[] {
  const types: ClueType[] = ['definition', 'anagram'];
  if (entry.synonym) types.push('synonym');
  if (entry.fillBlank) types.push('fillBlank');
  if (entry.riddle) types.push('riddle');
  return types;
}

/**
 * Weight tables bias harder difficulties toward the puzzle layer
 * (riddle/anagram) and easier ones toward plain recall (definition).
 * Types not present on a given word (e.g. no authored riddle) are dropped
 * and the remaining weights are used as-is -- definition is always present
 * so there's always a fallback.
 */
const WEIGHTS: Record<Difficulty, Partial<Record<ClueType, number>>> = {
  easy: { definition: 70, synonym: 15, fillBlank: 15, riddle: 0, anagram: 5 },
  medium: { definition: 50, synonym: 15, fillBlank: 15, riddle: 10, anagram: 10 },
  hard: { definition: 35, synonym: 10, fillBlank: 10, riddle: 25, anagram: 20 },
};

function weightedPick(types: ClueType[], difficulty: Difficulty, rng: () => number): ClueType {
  const weights = WEIGHTS[difficulty];
  const weighted = types.map((t) => ({ type: t, weight: weights[t] ?? 5 }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * total;
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) return w.type;
  }
  return weighted[weighted.length - 1].type;
}

export function getClue(entry: WordEntry, difficulty: Difficulty, rng: () => number = Math.random): Clue {
  const type = weightedPick(availableClueTypes(entry), difficulty, rng);
  return { type, text: clueText(entry, type, rng), word: entry.word };
}

function clueText(entry: WordEntry, type: ClueType, rng: () => number): string {
  switch (type) {
    case 'definition':
      return entry.definition;
    case 'synonym':
      return `This means the same as: ${entry.synonym}`;
    case 'fillBlank':
      return entry.fillBlank ?? entry.definition;
    case 'riddle':
      return entry.riddle ?? entry.definition;
    case 'anagram':
      return `Unscramble the letters: ${makeAnagram(entry.word, rng)}`;
  }
}
