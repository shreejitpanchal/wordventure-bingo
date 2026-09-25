import { describe, expect, it } from 'vitest';
import type { CategoryId, Difficulty, SentenceQuestCategoryId, SynonymSafariCategoryId } from '../types';
import { WORD_BANKS } from './wordBanks';
import { WORD_BANK_CATEGORIES, WORD_BANK_LABELS } from './wordBankLabels';
import { SENTENCE_QUEST_BANKS } from './sentenceQuestBanks';
import { SENTENCE_QUEST_CATEGORIES, SENTENCE_QUEST_LABELS } from './sentenceQuestLabels';
import { SYNONYM_SAFARI_BANKS } from './synonymSafariBanks';
import { SYNONYM_SAFARI_CATEGORIES, SYNONYM_SAFARI_LABELS } from './synonymSafariLabels';
import { WORDS_NEEDED, generateCard, selectWordPool } from '../lib/cardGeneration';
import { MAX_WORD_COUNT, MIN_WORD_COUNT, generateLevel, selectWordscapesPool } from '../lib/wordscapes/gridGeneration';
import { MAX_QUESTION_COUNT, generateRound as generateQuestRound, selectQuestionPool } from '../lib/sentenceQuest';
import { MAX_PAIR_COUNT, generateRound as generateSafariRound, selectSynonymSafariPool } from '../lib/synonymSafari';
import { seededRng } from '../test/rng';

/**
 * Content invariants for the shipped JSON banks. Every rule here is one
 * CLAUDE.md documents as "verified via a standalone script" -- this file is
 * that script, run as a gate, so a content edit that breaks a rule fails
 * `test` instead of throwing at a kid mid-game. It is deliberately the
 * *structural* pass only: it cannot judge whether a sentence reads well or a
 * word is kid-appropriate -- that still needs a human reading a real sample
 * (see CLAUDE.md's "Sentence Quest mode" for what that pass has caught).
 */

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const WORD_BANK_IDS = Object.keys(WORD_BANKS) as CategoryId[];
const SENTENCE_QUEST_IDS = Object.keys(SENTENCE_QUEST_BANKS) as SentenceQuestCategoryId[];
const SYNONYM_SAFARI_IDS = Object.keys(SYNONYM_SAFARI_BANKS) as SynonymSafariCategoryId[];

/** Wordscapes-easy draws only 3-5 letter words; CLAUDE.md's "Word banks"
 * section explains why a pool this small starts visibly repeating. Every
 * shipped category clears this comfortably (smallest is science at 45). */
const MIN_EASY_SHORT_WORDS = 40;

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) dupes.add(v);
    seen.add(v);
  }
  return [...dupes];
}

describe('word banks (Bingo + Wordscapes)', () => {
  it('registers every category in the static label list, with matching labels', () => {
    expect(WORD_BANK_CATEGORIES.map((c) => c.id).sort()).toEqual([...WORD_BANK_IDS].sort());
    for (const id of WORD_BANK_IDS) {
      expect(WORD_BANKS[id].category).toBe(id);
      expect(WORD_BANKS[id].label).toBe(WORD_BANK_LABELS[id]);
    }
  });

  it.each(WORD_BANK_IDS)('%s: every entry is a well-formed uppercase word with a definition', (id) => {
    for (const entry of WORD_BANKS[id].words) {
      expect(entry.word).toMatch(/^[A-Z]+$/);
      expect(DIFFICULTIES).toContain(entry.difficulty);
      expect(entry.definition.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(WORD_BANK_IDS)('%s: has no duplicate words across tiers', (id) => {
    expect(duplicates(WORD_BANKS[id].words.map((w) => w.word))).toEqual([]);
  });

  it.each(WORD_BANK_IDS)('%s: every tier can fill a 5x5 Bingo card', (id) => {
    for (const difficulty of DIFFICULTIES) {
      const pool = selectWordPool(WORD_BANKS[id].words, id, difficulty);
      expect(pool.length, `${id}/${difficulty}`).toBeGreaterThanOrEqual(WORDS_NEEDED);
      expect(() => generateCard(pool, seededRng(1))).not.toThrow();
    }
  });

  it.each(WORD_BANK_IDS)('%s: the easy tier has enough 3-5 letter words for Wordscapes', (id) => {
    const shortWords = WORD_BANKS[id].words.filter(
      (w) => w.difficulty === 'easy' && w.word.length >= 3 && w.word.length <= 5,
    );
    expect(shortWords.length).toBeGreaterThanOrEqual(MIN_EASY_SHORT_WORDS);
  });

  it.each(WORD_BANK_IDS)('%s: Wordscapes generates at every difficulty and word count', (id) => {
    for (const difficulty of DIFFICULTIES) {
      const pool = selectWordscapesPool(WORD_BANKS[id].words, id, difficulty);
      for (let wordCount = MIN_WORD_COUNT; wordCount <= MAX_WORD_COUNT; wordCount++) {
        for (const seed of [1, 2]) {
          expect(() => generateLevel(pool, seededRng(seed), wordCount), `${id}/${difficulty}/${wordCount}`).not.toThrow();
        }
      }
    }
  });
});

describe('Sentence Quest question banks', () => {
  it('registers every category in the static label list, with matching labels', () => {
    expect(SENTENCE_QUEST_CATEGORIES.map((c) => c.id).sort()).toEqual([...SENTENCE_QUEST_IDS].sort());
    for (const id of SENTENCE_QUEST_IDS) {
      expect(SENTENCE_QUEST_BANKS[id].category).toBe(id);
      expect(SENTENCE_QUEST_BANKS[id].label).toBe(SENTENCE_QUEST_LABELS[id]);
    }
  });

  it.each(SENTENCE_QUEST_IDS)('%s: every question has one blank, 4 distinct options, and the answer among them', (id) => {
    for (const q of SENTENCE_QUEST_BANKS[id].questions) {
      const label = q.sentence;
      expect(q.sentence.match(/___/g)?.length, label).toBe(1);
      expect(q.options, label).toHaveLength(4);
      expect(new Set(q.options).size, label).toBe(4);
      expect(q.options.filter((o) => o === q.answer), label).toHaveLength(1);
      expect(DIFFICULTIES, label).toContain(q.difficulty);
      expect(q.explanation.trim().length, label).toBeGreaterThan(0);
    }
  });

  it.each(SENTENCE_QUEST_IDS)('%s: sentences are unique and free of doubled words/spaces', (id) => {
    const sentences = SENTENCE_QUEST_BANKS[id].questions.map((q) => q.sentence);
    expect(duplicates(sentences)).toEqual([]);
    for (const sentence of sentences) {
      // "the the", "standing among the the crowd" -- a real bug this caught once.
      expect(sentence, sentence).not.toMatch(/\b(\w+) \1\b/i);
      expect(sentence, sentence).not.toMatch(/ {2}/);
    }
  });

  it.each(SENTENCE_QUEST_IDS)('%s: every tier can fill the largest round', (id) => {
    for (const difficulty of DIFFICULTIES) {
      const pool = selectQuestionPool(SENTENCE_QUEST_BANKS[id].questions, difficulty);
      expect(pool.length, `${id}/${difficulty}`).toBeGreaterThanOrEqual(MAX_QUESTION_COUNT);
      expect(() => generateQuestRound(pool, seededRng(1), MAX_QUESTION_COUNT)).not.toThrow();
    }
  });
});

describe('Synonym Safari pair banks', () => {
  it('registers every category in the static label list, with matching labels', () => {
    expect(SYNONYM_SAFARI_CATEGORIES.map((c) => c.id).sort()).toEqual([...SYNONYM_SAFARI_IDS].sort());
    for (const id of SYNONYM_SAFARI_IDS) {
      expect(SYNONYM_SAFARI_BANKS[id].label).toBe(SYNONYM_SAFARI_LABELS[id]);
    }
  });

  it.each(SYNONYM_SAFARI_IDS)('%s: every pair is well-formed and never matches a word to itself', (id) => {
    for (const p of SYNONYM_SAFARI_BANKS[id].pairs) {
      expect(p.word.trim().length).toBeGreaterThan(0);
      expect(p.match.trim().length).toBeGreaterThan(0);
      expect(p.word).not.toBe(p.match);
      expect(DIFFICULTIES).toContain(p.difficulty);
    }
  });

  it.each(SYNONYM_SAFARI_IDS)('%s: no source word repeats within the file', (id) => {
    expect(duplicates(SYNONYM_SAFARI_BANKS[id].pairs.map((p) => p.word))).toEqual([]);
  });

  it.each(SYNONYM_SAFARI_IDS)('%s: within each tier no match text repeats, and the largest round fills', (id) => {
    // Rounds are drawn per tier, so a repeated `match` across tiers is
    // harmless; within a tier it would be a visually-identical right-column
    // cell that generateRound has to skip around.
    for (const difficulty of DIFFICULTIES) {
      const pool = selectSynonymSafariPool(SYNONYM_SAFARI_BANKS[id].pairs, difficulty);
      expect(duplicates(pool.map((p) => p.match)), `${id}/${difficulty}`).toEqual([]);
      expect(pool.length, `${id}/${difficulty}`).toBeGreaterThanOrEqual(MAX_PAIR_COUNT);
      expect(() => generateSafariRound(pool, seededRng(1), MAX_PAIR_COUNT)).not.toThrow();
    }
  });
});
