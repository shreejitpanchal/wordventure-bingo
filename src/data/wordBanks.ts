import type { CategoryId, WordBank } from '../types';
import spelling from './wordbanks/spelling.json';
import animals from './wordbanks/animals.json';
import geography from './wordbanks/geography.json';
import science from './wordbanks/science.json';
import freeplay from './wordbanks/freeplay.json';

export const WORD_BANKS: Record<CategoryId, WordBank> = {
  spelling: spelling as WordBank,
  animals: animals as WordBank,
  geography: geography as WordBank,
  science: science as WordBank,
  freeplay: freeplay as WordBank,
};

export const CATEGORY_ORDER: CategoryId[] = ['spelling', 'animals', 'geography', 'science', 'freeplay'];
