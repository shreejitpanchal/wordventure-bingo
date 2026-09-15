import type { Difficulty, SentenceQuestion } from '../types';
import { shuffle } from './random';

// A curated menu option list (like CALL_SECONDS_OPTIONS in caller.ts),
// not "every integer in range" (like Wordscapes' word count) -- the range
// here is wide enough (5-20) that listing every value would be an unwieldy
// number of chips in the menu.
export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;
export const MIN_QUESTION_COUNT = QUESTION_COUNT_OPTIONS[0];
export const MAX_QUESTION_COUNT = QUESTION_COUNT_OPTIONS[QUESTION_COUNT_OPTIONS.length - 1];
export const DEFAULT_QUESTION_COUNT = 10;

export function selectQuestionPool(questions: SentenceQuestion[], difficulty: Difficulty): SentenceQuestion[] {
  return questions.filter((q) => q.difficulty === difficulty);
}

/**
 * Builds one round: `questionCount` unique questions sampled from the pool,
 * each with its own `options` shuffled into a random on-screen order (so
 * the correct answer isn't predictably always in the same slot). Grading
 * is always by string equality against `answer`, never by index, so this
 * shuffle can never cause a misgrade. Throws if the pool can't fill a round
 * -- a shipped question bank running short is a data bug, not a state to
 * render around (same convention as cardGeneration's generateCard).
 */
export function generateRound(
  pool: SentenceQuestion[],
  rng: () => number = Math.random,
  questionCount: number = DEFAULT_QUESTION_COUNT,
): SentenceQuestion[] {
  const targetCount = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, questionCount));
  if (pool.length < targetCount) {
    throw new Error(
      `Not enough questions to build a round: need ${targetCount}, got ${pool.length}. Add more questions to this category/difficulty.`,
    );
  }
  const picked = shuffle(pool, rng).slice(0, targetCount);
  return picked.map((q) => ({ ...q, options: shuffle(q.options, rng) }));
}

export function isCorrect(question: SentenceQuestion, chosenOption: string): boolean {
  return chosenOption === question.answer;
}

/** Splits a sentence on its blank marker ("___") for rendering around a
 * blank/answer slot. Every authored sentence must contain exactly one. */
export function splitSentence(sentence: string): { before: string; after: string } {
  const index = sentence.indexOf('___');
  if (index === -1) {
    throw new Error(`Sentence has no "___" blank marker: "${sentence}"`);
  }
  return { before: sentence.slice(0, index), after: sentence.slice(index + 3) };
}
