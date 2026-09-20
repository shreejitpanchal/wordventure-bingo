import type { SynonymSafariBank, SynonymSafariCategoryId } from '../types';
import synonyms from './synonymSafariBanks/synonyms.json';
import antonyms from './synonymSafariBanks/antonyms.json';

export const SYNONYM_SAFARI_BANKS: Record<SynonymSafariCategoryId, SynonymSafariBank> = {
  synonyms: synonyms as SynonymSafariBank,
  antonyms: antonyms as SynonymSafariBank,
};

export const SYNONYM_SAFARI_CATEGORY_ORDER: SynonymSafariCategoryId[] = ['synonyms', 'antonyms'];
