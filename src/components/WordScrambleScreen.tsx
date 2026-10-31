import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { WordScrambleConfig, WordScrambleResult } from '../types';
import type { ModeGameScreenProps } from '../modes/types';
import { WORD_BANKS } from '../data/wordBanks';
import { correctPrefix, generateRound, isCorrect, selectScramblePool } from '../lib/wordScramble';
import { screenVariants, withReducedMotion } from '../lib/motion';
import Mascot from './Mascot';
import styles from './WordScrambleScreen.module.css';

// excludeItems/onRoundStart carry the previous round's words -- see
// generateRound's excludeWords param.
type Props = ModeGameScreenProps<WordScrambleConfig, WordScrambleResult>;

/** 'solved'/'skipped' hold the finished word on screen for a beat before
 * moving on, so the player sees the real spelling either way. */
type Phase = 'playing' | 'solved' | 'skipped';

const ADVANCE_MS: Record<Exclude<Phase, 'playing'>, number> = { solved: 900, skipped: 1800 };
const WRONG_MS = 550;

export default function WordScrambleScreen({ config, context, rng, excludeItems, onRoundStart, onComplete, onExit, reduceMotion }: Props) {
  const { sound } = context;
  const bank = WORD_BANKS[config.category];
  const wordEntries = useMemo(
    () => (config.category === 'freeplay' ? [...bank.words, ...context.freeplayWords] : bank.words),
    [bank, config.category, context.freeplayWords],
  );
  const pool = useMemo(
    () => selectScramblePool(wordEntries, config.category, config.difficulty),
    [wordEntries, config.category, config.difficulty],
  );
  const [round] = useState(() => generateRound(pool, rng, config.wordCount, new Set(excludeItems)));

  const [index, setIndex] = useState(0);
  // Tile ids placed so far, in answer order. The first `locked` come from
  // hints and survive ✕ / a wrong guess.
  const [answer, setAnswer] = useState<number[]>([]);
  const [locked, setLocked] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [wrongKey, setWrongKey] = useState<number | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  // Sticky for the rest of the round, like Wordscapes' `assisted`.
  const [assisted, setAssisted] = useState(false);

  const item = round[index];
  const isLast = index === round.length - 1;
  // Derived, not tracked: the round is over once the last word stops being
  // played, whichever way it ended. Shows the Continue panel rather than
  // jumping straight to the win screen (same as the other modes).
  const roundOver = isLast && phase !== 'playing';
  const used = new Set(answer);

  // Reports this round's words up to App.tsx once, so the next round
  // (a fresh mount after the win screen) can avoid repeating them.
  useEffect(() => {
    onRoundStart(round.map((w) => w.word));
  }, [round, onRoundStart]);

  // A wrong full answer shakes, then falls back to just the hint letters.
  useEffect(() => {
    if (wrongKey === null) return;
    const id = setTimeout(() => {
      setAnswer((prev) => prev.slice(0, locked));
      setWrongKey(null);
    }, WRONG_MS);
    return () => clearTimeout(id);
  }, [wrongKey, locked]);

  useEffect(() => {
    if (phase === 'playing' || isLast) return;
    const id = setTimeout(() => {
      setIndex((i) => i + 1);
      setAnswer([]);
      setLocked(0);
      setPhase('playing');
    }, ADVANCE_MS[phase]);
    return () => clearTimeout(id);
  }, [phase, isLast]);

  function handleTapTile(id: number) {
    if (phase !== 'playing' || wrongKey !== null || used.has(id)) return;
    const next = [...answer, id];
    setAnswer(next);
    if (next.length < item.word.length) {
      sound.play('tap');
    } else if (isCorrect(item, next)) {
      setPhase('solved');
      setSolvedCount((n) => n + 1);
      sound.play('correct');
    } else {
      setWrongKey(Date.now());
      sound.play('wrong');
    }
  }

  function handleClear() {
    if (phase !== 'playing' || wrongKey !== null) return;
    setAnswer(answer.slice(0, locked));
  }

  // Locks in the next correct letter. Stops one short of the whole word so
  // the player still places the last tile themselves -- Skip is the way to
  // just see the answer.
  function handleHint() {
    if (phase !== 'playing' || wrongKey !== null || locked >= item.word.length - 1) return;
    setAnswer(correctPrefix(item, locked + 1));
    setLocked(locked + 1);
    setAssisted(true);
    sound.play('select');
  }

  function handleSkip() {
    if (phase !== 'playing') return;
    setWrongKey(null);
    setAnswer(correctPrefix(item, item.word.length));
    setPhase('skipped');
    setAssisted(true);
    sound.play('select');
  }

  const slotState = phase === 'solved' ? styles.slotSolved : phase === 'skipped' ? styles.slotSkipped : '';

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
        <span className={styles.progress}>
          {index + 1} / {round.length}
        </span>
      </div>

      <div className={styles.middleRegion}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className={styles.puzzle}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <p className={styles.clue}>{item.definition}</p>

            <div
              key={wrongKey ?? 'slots'}
              className={`${styles.slots} ${wrongKey !== null ? (reduceMotion ? styles.slotsWrongStatic : styles.slotsWrongShake) : ''}`}
              aria-label={`Your answer, ${item.word.length} letters`}
            >
              {item.word.split('').map((_, i) => {
                const tile = item.tiles.find((t) => t.id === answer[i]);
                return (
                  <span key={i} className={`${styles.slot} ${i < locked ? styles.slotLocked : ''} ${slotState}`}>
                    {tile?.letter ?? ''}
                  </span>
                );
              })}
            </div>

            <div className={styles.tiles}>
              {item.tiles.map((tile) => (
                <motion.button
                  key={tile.id}
                  type="button"
                  className={styles.tile}
                  disabled={used.has(tile.id) || phase !== 'playing'}
                  onClick={() => handleTapTile(tile.id)}
                  whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                >
                  {tile.letter}
                </motion.button>
              ))}
            </div>

            <p className={styles.feedback} aria-live="polite">
              {phase === 'solved' ? '🎉 Nice!' : phase === 'skipped' ? `The word was ${item.word}` : ' '}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {roundOver ? (
        <div className={styles.continuePanel}>
          <Mascot mood={assisted ? 'think' : 'happy'} reduceMotion={reduceMotion} size="sm" />
          <p className={styles.continueMessage}>
            You unscrambled {solvedCount} of {round.length}!
          </p>
          <motion.button
            className={styles.continueButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onComplete({ wordsSolved: solvedCount, totalCount: round.length, assisted })}
          >
            Continue
          </motion.button>
        </div>
      ) : (
        <div className={styles.bottomControls}>
          <button className={styles.assistButton} onClick={handleClear} aria-label="Clear letters">
            ✕ Clear
          </button>
          <button className={styles.assistButton} onClick={handleHint} disabled={locked >= item.word.length - 1}>
            💡 Hint
          </button>
          <button className={styles.assistButton} onClick={handleSkip}>
            ⏭️ Skip
          </button>
        </div>
      )}
    </motion.main>
  );
}
