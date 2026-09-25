import type { SynonymSafariBank, SynonymSafariCategoryId } from '../types';
import synonyms from './synonymSafariBanks/synonyms.json';
import antonyms from './synonymSafariBanks/antonyms.json';

// Content only -- see synonymSafariLabels.ts for menu order/labels.
export const SYNONYM_SAFARI_BANKS: Record<SynonymSafariCategoryId, SynonymSafariBank> = {
  synonyms: synonyms as SynonymSafariBank,
  antonyms: antonyms as SynonymSafariBank,
};
