import type { CategoryId } from '../types';

/**
 * Menu order + display labels for the Bingo/Wordscapes word-bank categories,
 * deliberately NOT read from the bank JSON: the menu and win screens need
 * these eagerly, while the banks themselves are only loaded with the mode's
 * lazy chunk. src/data/banks.test.ts asserts each label matches its JSON.
 */
export const WORD_BANK_CATEGORIES: readonly { id: CategoryId; label: string }[] = [
  { id: 'spelling', label: 'Spelling' },
  { id: 'animals', label: 'Animals' },
  { id: 'geography', label: 'Geography' },
  { id: 'science', label: 'Science' },
  { id: 'freeplay', label: 'Free Play (editable)' },
];

export const WORD_BANK_LABELS: Record<CategoryId, string> = Object.fromEntries(
  WORD_BANK_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<CategoryId, string>;
