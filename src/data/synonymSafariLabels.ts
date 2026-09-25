import type { SynonymSafariCategoryId } from '../types';
import type { ModeCategory } from '../modes/types';

/** Menu order + labels for Synonym Safari categories -- static for the same
 * reason as wordBankLabels.ts. banks.test.ts asserts each matches its JSON. */
export const SYNONYM_SAFARI_CATEGORIES: readonly ModeCategory<SynonymSafariCategoryId>[] = [
  { id: 'synonyms', label: 'Synonyms', emoji: '🤝' },
  { id: 'antonyms', label: 'Antonyms / Opposites', emoji: '🔄' },
];

export const SYNONYM_SAFARI_LABELS: Record<SynonymSafariCategoryId, string> = Object.fromEntries(
  SYNONYM_SAFARI_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<SynonymSafariCategoryId, string>;
