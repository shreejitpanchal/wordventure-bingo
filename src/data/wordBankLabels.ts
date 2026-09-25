import type { CategoryId } from '../types';
import type { ModeCategory } from '../modes/types';

/**
 * Menu order + display labels for the Bingo/Wordscapes word-bank categories,
 * deliberately NOT read from the bank JSON: the menu and win screens need
 * these eagerly, while the banks themselves are only loaded with the mode's
 * lazy chunk. src/data/banks.test.ts asserts each label matches its JSON.
 */
export const WORD_BANK_CATEGORIES: readonly ModeCategory<CategoryId>[] = [
  { id: 'spelling', label: 'Spelling', emoji: '🔤' },
  { id: 'animals', label: 'Animals', emoji: '🐘' },
  { id: 'geography', label: 'Geography', emoji: '🌍' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'freeplay', label: 'Free Play (editable)', emoji: '✏️' },
];

export const WORD_BANK_LABELS: Record<CategoryId, string> = Object.fromEntries(
  WORD_BANK_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<CategoryId, string>;
