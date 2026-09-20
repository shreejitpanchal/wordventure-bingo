import { describe, expect, it } from 'vitest';
import type { SentenceQuestion } from '../types';
import {
  DEFAULT_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
  generateRound,
  isCorrect,
  selectQuestionPool,
  splitSentence,
} from './sentenceQuest';
import { seededRng } from '../test/rng';

function makeQuestions(count: number, difficulty: SentenceQuestion['difficulty'] = 'easy'): SentenceQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    sentence: `Question ${i}: the cat ___ on the mat.`,
    options: [`answer${i}`, `wrong${i}a`, `wrong${i}b`, `wrong${i}c`],
    answer: `answer${i}`,
    difficulty,
    explanation: `Explanation ${i}`,
  }));
}

describe('selectQuestionPool', () => {
  it('filters by difficulty', () => {
    const questions = [...makeQuestions(3, 'easy'), ...makeQuestions(2, 'hard')];
    expect(selectQuestionPool(questions, 'easy')).toHaveLength(3);
    expect(selectQuestionPool(questions, 'hard')).toHaveLength(2);
    expect(selectQuestionPool(questions, 'medium')).toHaveLength(0);
  });
});

describe('generateRound', () => {
  it('throws when the pool is smaller than the requested round size', () => {
    const questions = makeQuestions(DEFAULT_QUESTION_COUNT - 1);
    expect(() => generateRound(questions, Math.random, DEFAULT_QUESTION_COUNT)).toThrow(/Not enough questions/);
  });

  it('builds a round of the requested size with no duplicate questions', () => {
    const questions = makeQuestions(DEFAULT_QUESTION_COUNT + 10);
    const round = generateRound(questions, seededRng(1), DEFAULT_QUESTION_COUNT);
    expect(round).toHaveLength(DEFAULT_QUESTION_COUNT);
    const seen = new Set(round.map((q) => q.sentence));
    expect(seen.size).toBe(DEFAULT_QUESTION_COUNT);
  });

  it('shuffles each question\'s options without ever losing or duplicating one', () => {
    const questions = makeQuestions(DEFAULT_QUESTION_COUNT);
    const round = generateRound(questions, seededRng(2), DEFAULT_QUESTION_COUNT);
    for (const q of round) {
      const original = questions.find((orig) => orig.sentence === q.sentence)!;
      expect([...q.options].sort()).toEqual([...original.options].sort());
      expect(q.options).toContain(q.answer);
    }
  });

  it('clamps an out-of-range questionCount into MIN/MAX_QUESTION_COUNT', () => {
    const questions = makeQuestions(50);
    expect(generateRound(questions, seededRng(3), 1)).toHaveLength(MIN_QUESTION_COUNT);
    expect(generateRound(questions, seededRng(3), 999)).toHaveLength(MAX_QUESTION_COUNT);
  });

  it('prefers questions not in excludeSentences when the pool has enough others', () => {
    const questions = makeQuestions(DEFAULT_QUESTION_COUNT + 10);
    const excludeSentences = new Set(questions.slice(0, DEFAULT_QUESTION_COUNT).map((q) => q.sentence));
    const round = generateRound(questions, seededRng(4), DEFAULT_QUESTION_COUNT, excludeSentences);
    expect(round.every((q) => !excludeSentences.has(q.sentence))).toBe(true);
  });

  it('falls back to reusing excluded questions when the pool is too small to avoid them', () => {
    const questions = makeQuestions(DEFAULT_QUESTION_COUNT);
    const excludeSentences = new Set(questions.map((q) => q.sentence));
    const round = generateRound(questions, seededRng(5), DEFAULT_QUESTION_COUNT, excludeSentences);
    expect(round).toHaveLength(DEFAULT_QUESTION_COUNT);
  });
});

describe('isCorrect', () => {
  it('matches the chosen option against the answer by string equality', () => {
    const [question] = makeQuestions(1);
    expect(isCorrect(question, question.answer)).toBe(true);
    expect(isCorrect(question, 'somethingElse')).toBe(false);
  });
});

describe('splitSentence', () => {
  it('splits around the blank marker', () => {
    expect(splitSentence('The cat ___ on the mat.')).toEqual({ before: 'The cat ', after: ' on the mat.' });
  });

  it('throws for a sentence missing the blank marker', () => {
    expect(() => splitSentence('No blank here.')).toThrow(/no "___" blank marker/);
  });
});
