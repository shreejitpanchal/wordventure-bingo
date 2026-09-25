import type { SentenceQuestCategoryId } from '../types';

/** Menu order + labels for Sentence Quest categories -- static for the same
 * reason as wordBankLabels.ts (the ~1 MB question banks stay in the mode's
 * lazy chunk). banks.test.ts asserts each label matches its JSON. */
export const SENTENCE_QUEST_CATEGORIES: readonly { id: SentenceQuestCategoryId; label: string }[] = [
  { id: 'verbTense', label: 'Verb Tense' },
  { id: 'prepositions', label: 'Prepositions' },
  { id: 'synonymsAntonyms', label: 'Synonyms & Antonyms' },
  { id: 'idioms', label: 'Idioms & Expressions' },
  { id: 'grammarBasics', label: 'Grammar Basics' },
];

export const SENTENCE_QUEST_LABELS: Record<SentenceQuestCategoryId, string> = Object.fromEntries(
  SENTENCE_QUEST_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<SentenceQuestCategoryId, string>;
