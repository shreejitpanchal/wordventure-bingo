import type { SentenceQuestCategoryId } from '../types';
import type { ModeCategory } from '../modes/types';

/** Menu order + labels for Sentence Quest categories -- static for the same
 * reason as wordBankLabels.ts (the ~1 MB question banks stay in the mode's
 * lazy chunk). banks.test.ts asserts each label matches its JSON. */
export const SENTENCE_QUEST_CATEGORIES: readonly ModeCategory<SentenceQuestCategoryId>[] = [
  { id: 'verbTense', label: 'Verb Tense', emoji: '⏳' },
  { id: 'prepositions', label: 'Prepositions', emoji: '📍' },
  { id: 'synonymsAntonyms', label: 'Synonyms & Antonyms', emoji: '↔️' },
  { id: 'idioms', label: 'Idioms & Expressions', emoji: '💬' },
  { id: 'grammarBasics', label: 'Grammar Basics', emoji: '🧱' },
];

export const SENTENCE_QUEST_LABELS: Record<SentenceQuestCategoryId, string> = Object.fromEntries(
  SENTENCE_QUEST_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<SentenceQuestCategoryId, string>;
