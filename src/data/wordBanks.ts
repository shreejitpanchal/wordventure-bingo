import type { CategoryId, WordBank } from '../types';
import spelling from './wordbanks/spelling.json';
import animals from './wordbanks/animals.json';
import geography from './wordbanks/geography.json';
import science from './wordbanks/science.json';
import freeplay from './wordbanks/freeplay.json';

// Content only. Menu order/labels live in wordBankLabels.ts so importing
// this module (and its JSON) stays confined to the modes' lazy chunks.
export const WORD_BANKS: Record<CategoryId, WordBank> = {
  spelling: spelling as WordBank,
  animals: animals as WordBank,
  geography: geography as WordBank,
  science: science as WordBank,
  freeplay: freeplay as WordBank,
};
