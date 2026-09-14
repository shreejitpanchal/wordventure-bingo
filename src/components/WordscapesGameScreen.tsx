import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { WordscapesConfig } from '../types';
import { WORD_BANKS } from '../data/wordBanks';
import {
  generateLevel,
  isLevelComplete,
  isWordFound,
  revealAll,
  revealRandomLetter,
  revealWord,
  selectWordscapesPool,
} from '../lib/wordscapes/gridGeneration';
import { getFreeplayWords } from '../lib/storage';
import { screenVariants, withReducedMotion } from '../lib/motion';
import CrosswordGrid from './CrosswordGrid';
import LetterWheel from './LetterWheel';
import styles from './WordscapesGameScreen.module.css';

interface Props {
  config: WordscapesConfig;
  /** `assisted` is true if the player used any reveal help (a single-letter
   * hint and/or Give Up) at any point -- even if they went on to finish the
   * rest of the puzzle themselves. */
  onComplete: (bonusWordsFound: number, assisted: boolean) => void;
  onExit: () => void;
  reduceMotion: boolean;
}

interface Feedback {
  key: number;
  kind: 'correct' | 'bonus' | 'invalid';
  word: string;
}

interface ClueHint {
  key: string;
  lines: string[];
}

export default function WordscapesGameScreen({ config, onComplete, onExit, reduceMotion }: Props) {
  const bank = WORD_BANKS[config.category];
  const wordEntries = useMemo(
    () => (config.category === 'freeplay' ? [...bank.words, ...getFreeplayWords()] : bank.words),
    [bank, config.category],
  );
  const pool = useMemo(
    () => selectWordscapesPool(wordEntries, config.category, config.difficulty),
    [wordEntries, config.category, config.difficulty],
  );

  const [level, setLevel] = useState(() => generateLevel(pool, Math.random, config.wordCount));
  const [foundBonusWords, setFoundBonusWords] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [clueHint, setClueHint] = useState<ClueHint | null>(null);
  // Sticky for the rest of this puzzle: sets the moment any reveal help is
  // used and never clears, regardless of how the puzzle eventually finishes.
  const [assisted, setAssisted] = useState(false);

  // Whether every cell is now revealed -- derived from grid state rather
  // than tracked separately, so it stays correct no matter which path got
  // it there: the player's own last word, repeated single-letter hints, or
  // Give Up. Once true, there's nothing left to do but continue.
  const complete = isLevelComplete(level.grid);

  function showFeedback(kind: Feedback['kind'], word: string) {
    setFeedback({ key: Date.now(), kind, word });
  }

  // Auto-clears so a stale "Nice! WORD" message doesn't linger forever if
  // the player pauses between finds.
  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 2200);
    return () => clearTimeout(id);
  }, [feedback]);

  function handleWordTraced(rawWord: string) {
    const word = rawWord.toUpperCase();
    if (word.length === 0 || isWordFound(level.grid, word)) return;

    const isGridWord = level.grid.placedWords.some((p) => p.word === word);
    if (isGridWord) {
      const nextGrid = revealWord(level.grid, word);
      setLevel((prev) => ({ ...prev, grid: nextGrid }));
      showFeedback('correct', word);
      setClueHint(null); // that hint's job is done
      // Don't call onComplete here even if this was the last word -- `complete`
      // (derived below from grid state) will flip true on this render and swap
      // in the review panel instead, same as the Give Up/hint paths. Advancing
      // straight to the win screen skipped letting the player see their own
      // finished grid.
      return;
    }

    if (level.bonusWords.includes(word) && !foundBonusWords.has(word)) {
      setFoundBonusWords((prev) => new Set(prev).add(word));
      showFeedback('bonus', word);
      return;
    }

    showFeedback('invalid', word);
  }

  // Repeatable hint: reveals one random still-hidden letter and leaves the
  // player to keep playing. Pressing it enough times eventually reveals
  // everything (the `complete` panel then takes over automatically).
  function handleRevealLetter() {
    setLevel((prev) => ({ ...prev, grid: revealRandomLetter(prev.grid, Math.random) }));
    setAssisted(true);
    setClueHint(null);
    setFeedback(null);
  }

  // Last-resort escape hatch for a kid who's stuck: reveals the whole grid
  // in place (so they can actually read the real words, not just skip past
  // them) instead of jumping straight to a win screen.
  function handleGiveUp() {
    setLevel((prev) => ({ ...prev, grid: revealAll(prev.grid) }));
    setAssisted(true);
    setClueHint(null);
    setFeedback(null);
  }

  // Tapping a grid cell shows the definition clue(s) for whichever word(s)
  // pass through it -- without this, Wordscapes gives zero indication of
  // what to spell, unlike Bingo's caller clues built from the same data.
  function handleCellClick(row: number, col: number) {
    const wordsHere = level.grid.placedWords.filter((p) => {
      for (let i = 0; i < p.word.length; i++) {
        const r = p.direction === 'down' ? p.row + i : p.row;
        const c = p.direction === 'across' ? p.col + i : p.col;
        if (r === row && c === col) return true;
      }
      return false;
    });
    if (wordsHere.length === 0) return;

    const lines = wordsHere.map((p) => {
      const entry = pool.find((w) => w.word === p.word);
      const label = p.direction === 'across' ? 'Across' : 'Down';
      const clue = entry?.definition ?? 'No clue available.';
      return `${label} (${p.word.length} letters): ${clue}`;
    });
    setClueHint({ key: `${row},${col}`, lines });
  }

  const feedbackText: Record<Feedback['kind'], (word: string) => string> = {
    correct: (word) => `Nice! ${word}`,
    bonus: (word) => `Bonus word! ${word} (+1)`,
    invalid: (word) => `"${word}" isn't in this puzzle`,
  };

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.topBar}>
        <button className={styles.exitButton} onClick={onExit} aria-label="Back to menu">
          ← Menu
        </button>
        <span className={styles.categoryLabel}>
          {bank.label} · {config.difficulty}
        </span>
        <span className={styles.bonusCount}>⭐ {foundBonusWords.size}</span>
      </div>

      <div className={styles.feedbackSlot}>
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.p
              key={feedback.key}
              className={`${styles.feedback} ${styles[feedback.kind]}`}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              {feedbackText[feedback.kind](feedback.word)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.hintSlot}>
        <AnimatePresence mode="wait">
          {clueHint && (
            <motion.div
              key={clueHint.key}
              className={styles.hint}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              {clueHint.lines.map((line, i) => (
                <p key={i} className={styles.hintLine}>
                  {line}
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CrosswordGrid grid={level.grid} reduceMotion={reduceMotion} onCellClick={handleCellClick} />

      {complete ? (
        <div className={styles.revealedPanel}>
          <p className={styles.revealedMessage}>Here are the answers! Take a look, then keep going.</p>
          <motion.button
            className={styles.continueButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onComplete(foundBonusWords.size, assisted)}
          >
            Continue
          </motion.button>
        </div>
      ) : (
        <>
          <LetterWheel tiles={level.wheel} onWordTraced={handleWordTraced} reduceMotion={reduceMotion} />
          <div className={styles.assistRow}>
            <button className={styles.assistButton} onClick={handleRevealLetter}>
              💡 Reveal a Letter
            </button>
            <button className={styles.assistButton} onClick={handleGiveUp}>
              🏳️ Give Up
            </button>
          </div>
        </>
      )}
    </motion.main>
  );
}
