import { describe, expect, it } from 'vitest';
import type { GameMode } from '../types';
import { MODES, modeById } from './index';
import { bump, maxValue, sumValues } from './types';
import { DEFAULT_STREAKS, recordBingoLoss, recordBingoWin } from './bingo';
import { DEFAULT_WORDSCAPES_STATS, recordWordscapesCompletion } from './wordscapes';
import { DEFAULT_SENTENCE_QUEST_STATS, recordSentenceQuestRound } from './sentenceQuest';
import { DEFAULT_SYNONYM_SAFARI_STATS, recordSynonymSafariRound } from './synonymSafari';
import { defaultMenuSelection, resolveMenuSelection } from './menuSelection';

describe('menu selection', () => {
  it('defaults to the first mode on easy with every mode on its default config', () => {
    const sel = defaultMenuSelection();
    expect(sel.modeId).toBe(MODES[0].id);
    expect(sel.difficulty).toBe('easy');
    for (const mode of MODES) expect(sel.configs[mode.id]).toEqual(mode.defaultConfig);
  });

  it('returns defaults for nothing stored', () => {
    expect(resolveMenuSelection(null)).toEqual(defaultMenuSelection());
  });

  it('round-trips a valid stored selection', () => {
    const stored = {
      modeId: 'wordscapes',
      difficulty: 'hard',
      configs: {
        wordscapes: { category: 'animals', difficulty: 'hard', wordCount: 8 },
        bingo: { category: 'science', difficulty: 'hard', players: 2, callSeconds: 45 },
      },
    };
    const sel = resolveMenuSelection(stored);
    expect(sel.modeId).toBe('wordscapes');
    expect(sel.difficulty).toBe('hard');
    expect(sel.configs.wordscapes).toEqual(stored.configs.wordscapes);
    expect(sel.configs.bingo).toEqual(stored.configs.bingo);
    // Modes absent from storage keep their default config untouched.
    expect(sel.configs['sentence-quest']).toEqual(modeById('sentence-quest').defaultConfig);
  });

  it('falls back field-by-field on unknown modes, categories and mistyped options', () => {
    const sel = resolveMenuSelection({
      modeId: 'retired-mode',
      difficulty: 'impossible',
      configs: {
        bingo: { category: 'not-a-category', players: 'two', callSeconds: 30, extra: true },
        'synonym-safari': 'garbage',
      },
    });
    expect(sel.modeId).toBe(MODES[0].id);
    expect(sel.difficulty).toBe('easy');
    const bingo = modeById('bingo').defaultConfig as Record<string, unknown>;
    expect(sel.configs.bingo).toEqual({ ...bingo, callSeconds: 30 });
    expect(sel.configs['synonym-safari']).toEqual(modeById('synonym-safari').defaultConfig);
  });
});

describe('mode manifest', () => {
  it('has a unique id, stats key and label per mode', () => {
    const ids = MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = MODES.map((m) => m.stats.key);
    expect(new Set(keys).size).toBe(keys.length);
    const labels = MODES.map((m) => m.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('keeps the historical storage keys for the modes that predate the registry', () => {
    // storage.ts's legacy migration writes into these exact buckets, and
    // existing players' data already lives under them -- renaming either
    // would silently zero a player's progress.
    expect(modeById('bingo').stats.key).toBe('streaks');
    expect(modeById('wordscapes').stats.key).toBe('wordscapesStats');
  });

  it("starts every mode on a category it actually offers, with 'easy' difficulty", () => {
    for (const mode of MODES) {
      expect(mode.categories.map((c) => c.id)).toContain(mode.defaultConfig.category);
      expect(mode.defaultConfig.difficulty).toBe('easy');
      expect(mode.categories.length).toBeGreaterThan(0);
    }
  });

  it('produces a summary line list and a null stat line from empty stats', () => {
    for (const mode of MODES) {
      expect(mode.menuStatLine(mode.defaultConfig, mode.stats.defaults)).toBeNull();
      const summary = mode.stats.summary(mode.stats.defaults);
      expect(summary.length).toBeGreaterThan(0);
      for (const line of summary) expect(line.value).toBe(0);
    }
  });

  it('shows a stat line once the default category has progress', () => {
    for (const mode of MODES) {
      const stats = mode.stats.record(mode.stats.defaults, mode.defaultConfig, sampleResult(mode.id));
      expect(mode.menuStatLine(mode.defaultConfig, stats)).toMatch(/: 1$/);
    }
  });

  it('throws an actionable error for an unregistered id', () => {
    expect(() => modeById('nope' as GameMode)).toThrow(/Register its descriptor/);
  });
});

/** An unassisted, fully-correct result for each mode -- the shape each
 * mode's `record` expects, exercised through the erased `AnyMode` surface
 * the same way App.tsx calls it. */
function sampleResult(id: GameMode): unknown {
  switch (id) {
    case 'bingo':
      return { patterns: ['row'] };
    case 'wordscapes':
      return { bonusWordsFound: 2, assisted: false };
    case 'sentence-quest':
      return { correctCount: 9, totalCount: 10 };
    case 'synonym-safari':
      return { pairsMatched: 6, assisted: false };
  }
}

describe('stats helpers', () => {
  it('bump increments immutably and treats a missing key as 0', () => {
    const before = { animals: 2 };
    const after = bump(before, 'science');
    expect(after).toEqual({ animals: 2, science: 1 });
    expect(before).toEqual({ animals: 2 });
    expect(bump(before, 'animals', 3)).toEqual({ animals: 5 });
  });

  it('sumValues/maxValue aggregate across categories', () => {
    expect(sumValues({ a: 1, b: 4 })).toBe(5);
    expect(maxValue({ a: 1, b: 4 })).toBe(4);
    expect(sumValues({})).toBe(0);
    expect(maxValue({})).toBe(0);
  });
});

describe('Bingo streaks', () => {
  it('a win bumps games, wins, current streak and best streak', () => {
    const s1 = recordBingoWin(DEFAULT_STREAKS, 'animals');
    const s2 = recordBingoWin(s1, 'animals');
    expect(s2.gamesPlayed.animals).toBe(2);
    expect(s2.wins.animals).toBe(2);
    expect(s2.currentStreak.animals).toBe(2);
    expect(s2.bestStreak.animals).toBe(2);
  });

  it('a loss counts the game and breaks the current streak but keeps the best', () => {
    const won = recordBingoWin(recordBingoWin(DEFAULT_STREAKS, 'animals'), 'animals');
    const lost = recordBingoLoss(won, 'animals');
    expect(lost.gamesPlayed.animals).toBe(3);
    expect(lost.wins.animals).toBe(2);
    expect(lost.currentStreak.animals).toBe(0);
    expect(lost.bestStreak.animals).toBe(2);
    // Other categories untouched.
    expect(lost.currentStreak.science).toBeUndefined();
  });

  it('never mutates the input', () => {
    const input = { ...DEFAULT_STREAKS, wins: { animals: 1 } };
    recordBingoWin(input, 'animals');
    recordBingoLoss(input, 'animals');
    expect(input.wins).toEqual({ animals: 1 });
    expect(DEFAULT_STREAKS).toEqual({ gamesPlayed: {}, wins: {}, currentStreak: {}, bestStreak: {} });
  });
});

describe('Wordscapes stats', () => {
  it('an unassisted solve counts the puzzle and credits bonus words', () => {
    const s = recordWordscapesCompletion(DEFAULT_WORDSCAPES_STATS, 'spelling', { bonusWordsFound: 3, assisted: false });
    expect(s.puzzlesCompleted.spelling).toBe(1);
    expect(s.bonusWordsFound.spelling).toBe(3);
  });

  it('an assisted finish still credits bonus words but not the completion', () => {
    const s = recordWordscapesCompletion(DEFAULT_WORDSCAPES_STATS, 'spelling', { bonusWordsFound: 1, assisted: true });
    expect(s.puzzlesCompleted.spelling).toBeUndefined();
    expect(s.bonusWordsFound.spelling).toBe(1);
  });

  it('zero bonus words leaves the bonus record untouched', () => {
    const s = recordWordscapesCompletion(DEFAULT_WORDSCAPES_STATS, 'spelling', { bonusWordsFound: 0, assisted: false });
    expect(s.bonusWordsFound).toEqual({});
  });
});

describe('Sentence Quest stats', () => {
  it('credits the round, the correct answers and the questions answered', () => {
    const s = recordSentenceQuestRound(DEFAULT_SENTENCE_QUEST_STATS, 'idioms', { correctCount: 7, totalCount: 10 });
    expect(s.roundsCompleted.idioms).toBe(1);
    expect(s.correctAnswers.idioms).toBe(7);
    expect(s.questionsAnswered.idioms).toBe(10);
  });
});

describe('Synonym Safari stats', () => {
  it('an unassisted round counts the round and the pairs', () => {
    const s = recordSynonymSafariRound(DEFAULT_SYNONYM_SAFARI_STATS, 'synonyms', { pairsMatched: 6, assisted: false });
    expect(s.roundsCompleted.synonyms).toBe(1);
    expect(s.pairsMatched.synonyms).toBe(6);
  });

  it('an assisted round credits the pairs but not the round', () => {
    const s = recordSynonymSafariRound(DEFAULT_SYNONYM_SAFARI_STATS, 'antonyms', { pairsMatched: 4, assisted: true });
    expect(s.roundsCompleted.antonyms).toBeUndefined();
    expect(s.pairsMatched.antonyms).toBe(4);
  });
});
