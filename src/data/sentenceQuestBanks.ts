import type { SentenceQuestBank, SentenceQuestCategoryId } from '../types';
import verbTense from './sentenceQuestBanks/verbTense.json';
import prepositions from './sentenceQuestBanks/prepositions.json';
import synonymsAntonyms from './sentenceQuestBanks/synonymsAntonyms.json';
import idioms from './sentenceQuestBanks/idioms.json';
import grammarBasics from './sentenceQuestBanks/grammarBasics.json';

// Content only -- see sentenceQuestLabels.ts for menu order/labels.
export const SENTENCE_QUEST_BANKS: Record<SentenceQuestCategoryId, SentenceQuestBank> = {
  verbTense: verbTense as SentenceQuestBank,
  prepositions: prepositions as SentenceQuestBank,
  synonymsAntonyms: synonymsAntonyms as SentenceQuestBank,
  idioms: idioms as SentenceQuestBank,
  grammarBasics: grammarBasics as SentenceQuestBank,
};
