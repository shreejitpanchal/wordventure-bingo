import type { SynonymSafariCategoryId } from '../types';

/** Menu order + labels for Synonym Safari categories -- static for the same
 * reason as wordBankLabels.ts. banks.test.ts asserts each matches its JSON. */
export const SYNONYM_SAFARI_CATEGORIES: readonly { id: SynonymSafariCategoryId; label: string }[] = [
  { id: 'synonyms', label: 'Synonyms' },
  { id: 'antonyms', label: 'Antonyms / Opposites' },
];

export const SYNONYM_SAFARI_LABELS: Record<SynonymSafariCategoryId, string> = Object.fromEntries(
  SYNONYM_SAFARI_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<SynonymSafariCategoryId, string>;
