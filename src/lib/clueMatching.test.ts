import { describe, expect, it } from 'vitest';
import type { WordEntry } from '../types';
import { availableClueTypes, getClue, makeAnagram } from './clueMatching';
import { sequenceRng, seededRng } from '../test/rng';

const minimalEntry: WordEntry = {
  word: 'GARDEN',
  difficulty: 'easy',
  definition: 'A piece of land used for growing flowers or vegetables.',
};

const fullEntry: WordEntry = {
  word: 'TESTWORD',
  difficulty: 'hard',
  definition: 'A trial word used for testing.',
  synonym: 'EXAMPLE',
  fillBlank: 'This is a ____.',
  riddle: 'I rhyme with best. What am I?',
};

describe('availableClueTypes', () => {
  it('only offers definition and anagram when no optional clues are authored', () => {
    expect(availableClueTypes(minimalEntry)).toEqual(['definition', 'anagram']);
  });

  it('includes every optional clue type that is present', () => {
    expect(availableClueTypes(fullEntry)).toEqual(['definition', 'anagram', 'synonym', 'fillBlank', 'riddle']);
  });
});

describe('makeAnagram', () => {
  it('preserves length and the exact letter multiset', () => {
    const anagram = makeAnagram('GARDEN', seededRng(5));
    expect(anagram).toHaveLength('GARDEN'.length);
    expect(anagram.split('').sort()).toEqual('GARDEN'.split('').sort());
  });

  it('usually differs from the original for words longer than 2 letters', () => {
    const anagram = makeAnagram('GARDEN', seededRng(5));
    expect(anagram).not.toBe('GARDEN');
  });
});

describe('getClue', () => {
  it('picks definition when the weighted roll lands in the first slice', () => {
    const clue = getClue(minimalEntry, 'easy', sequenceRng(0));
    expect(clue.type).toBe('definition');
    expect(clue.text).toBe(minimalEntry.definition);
    expect(clue.word).toBe('GARDEN');
  });

  it('picks riddle on a hard-difficulty roll near the top of the weight range', () => {
    const clue = getClue(fullEntry, 'hard', sequenceRng(0.99));
    expect(clue.type).toBe('riddle');
    expect(clue.text).toBe(fullEntry.riddle);
  });

  it('picks synonym mid-range and formats it as a "means the same as" clue', () => {
    const clue = getClue(fullEntry, 'hard', sequenceRng(0.6));
    expect(clue.type).toBe('synonym');
    expect(clue.text).toBe('This means the same as: EXAMPLE');
  });

  it('picks fillBlank in its slice and returns the authored sentence verbatim', () => {
    const clue = getClue(fullEntry, 'hard', sequenceRng(0.7));
    expect(clue.type).toBe('fillBlank');
    expect(clue.text).toBe(fullEntry.fillBlank);
  });

  it('formats an anagram clue with the unscramble prefix', () => {
    // minimalEntry only offers ['definition','anagram'] (weights 70/5, total 75
    // for easy), so the roll must land above 70/75 to reach the anagram slice.
    const clue = getClue(minimalEntry, 'easy', sequenceRng(0.95));
    expect(clue.type).toBe('anagram');
    expect(clue.text.startsWith('Unscramble the letters: ')).toBe(true);
    const scrambled = clue.text.replace('Unscramble the letters: ', '');
    expect(scrambled.split('').sort()).toEqual('GARDEN'.split('').sort());
  });
});
