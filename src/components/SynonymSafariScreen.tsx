import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SynonymSafariConfig, SynonymSafariResult } from '../types';
import type { ModeGameScreenProps } from '../modes/types';
import { SYNONYM_SAFARI_BANKS } from '../data/synonymSafariBanks';
import { checkMatch, generateRound, pickHintPair, selectSynonymSafariPool } from '../lib/synonymSafari';
import { shuffle } from '../lib/random';
import { screenVariants, withReducedMotion, zoomInVariants } from '../lib/motion';
import Mascot from './Mascot';
import styles from './SynonymSafariScreen.module.css';

// Safari-themed, not an uploaded image asset -- this app has no illustration
// assets anywhere (every other screen's iconography is emoji + CSS, e.g.
// MenuScreen's mode chips, Wordscapes' hint buttons), so the intro graphic
// stays consistent with that rather than introducing the app's first image.
const INTRO_EMOJIS = '🦁 🦒 🐘';

// excludeItems/onRoundStart carry the previous round's left-column *words*
// -- see generateRound's excludeWords param.
type Props = ModeGameScreenProps<SynonymSafariConfig, SynonymSafariResult>;

interface Selection {
  side: 'left' | 'right';
  value: string;
}

interface WrongFlash {
  key: number;
  word: string;
  match: string;
}

interface Link {
  word: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function SynonymSafariScreen({
  config,
  context,
  rng,
  excludeItems,
  onRoundStart,
  onComplete,
  onExit,
  reduceMotion,
}: Props) {
  const { sound } = context;
  const bank = SYNONYM_SAFARI_BANKS[config.category];
  const pool = useMemo(() => selectSynonymSafariPool(bank.pairs, config.difficulty), [bank, config.difficulty]);
  const [round] = useState(() => generateRound(pool, rng, config.pairCount, new Set(excludeItems)));
  const [rightColumn] = useState(() => shuffle(round, rng));

  // Gates the matching grid behind a brief "get ready" beat shown before
  // every round -- the words themselves aren't visible until the player
  // taps Start, rather than dropping them straight into a live grid.
  const [started, setStarted] = useState(false);

  const [selected, setSelected] = useState<Selection | null>(null);
  const [matchedWords, setMatchedWords] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<WrongFlash | null>(null);
  // Sticky for the rest of this round: set the moment the hint button is
  // used and never clears, regardless of how the round eventually finishes
  // -- mirrors Wordscapes' `assisted` exactly.
  const [assisted, setAssisted] = useState(false);

  // Connector lines between matched pairs, measured from the cells' rects
  // (scoped to this screen's columns container) whenever the matched set
  // changes -- same measure-in-a-layout-effect approach as LetterWheel.
  const columnsRef = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<Link[]>([]);

  const matchedMatches = useMemo(
    () => new Set(round.filter((p) => matchedWords.has(p.word)).map((p) => p.match)),
    [round, matchedWords],
  );

  // Derived from matched state, not tracked separately, so it stays correct
  // no matter which path got it there: the player's own last match or the
  // hint button -- same reasoning as Wordscapes' `complete`.
  const isRoundComplete = matchedWords.size === round.length;

  // Reports this round's words back up to App.tsx once, right after mount,
  // so the *next* round (started fresh after this component unmounts on the
  // win screen) knows what to avoid repeating -- see generateRound's
  // excludeWords param. `round` is fixed at mount (useState initializer)
  // and a new round is always a fresh mount, so this only ever fires once.
  useEffect(() => {
    onRoundStart(round.map((p) => p.word));
  }, [round, onRoundStart]);

  // Auto-clears so the shake/flash is a transient nudge, not a lingering state.
  useEffect(() => {
    if (!wrongFlash) return;
    const id = setTimeout(() => setWrongFlash(null), 600);
    return () => clearTimeout(id);
  }, [wrongFlash]);

  useLayoutEffect(() => {
    const container = columnsRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const next: Link[] = [];
    for (const pair of round) {
      if (!matchedWords.has(pair.word)) continue;
      const left = container.querySelector<HTMLElement>(`[data-side="left"][data-value="${CSS.escape(pair.word)}"]`);
      const right = container.querySelector<HTMLElement>(`[data-side="right"][data-value="${CSS.escape(pair.match)}"]`);
      if (!left || !right) continue;
      const l = left.getBoundingClientRect();
      const r = right.getBoundingClientRect();
      next.push({
        word: pair.word,
        x1: l.right - box.left,
        y1: l.top - box.top + l.height / 2,
        x2: r.left - box.left,
        y2: r.top - box.top + r.height / 2,
      });
    }
    setLinks(next);
  }, [matchedWords, round, started]);

  function handleTapCell(side: 'left' | 'right', value: string) {
    if (isRoundComplete) return;
    const alreadyMatched = side === 'left' ? matchedWords.has(value) : matchedMatches.has(value);
    if (alreadyMatched) return;

    if (!selected || selected.side === side) {
      sound.play('tap');
      setSelected({ side, value });
      return;
    }

    // A selection exists on the other column -- resolve the pair, taps can
    // come in either order (left-then-right or right-then-left).
    const word = side === 'left' ? value : selected.value;
    const match = side === 'left' ? selected.value : value;
    setSelected(null);
    if (checkMatch(round, word, match)) {
      setMatchedWords((prev) => new Set(prev).add(word));
      sound.play('correct');
    } else {
      setWrongFlash({ key: Date.now(), word, match });
      sound.play('wrong');
    }
  }

  // Repeatable hint: locks one random still-unmatched pair and leaves the
  // player to keep going, same shape as Wordscapes' reveal-a-letter button.
  function handleHint() {
    if (isRoundComplete) return;
    const hint = pickHintPair(round, matchedWords, rng);
    setMatchedWords((prev) => new Set(prev).add(hint.word));
    setAssisted(true);
    setSelected(null);
    setWrongFlash(null);
    sound.play('select');
  }

  function cellClass(side: 'left' | 'right', value: string): string {
    const matched = side === 'left' ? matchedWords.has(value) : matchedMatches.has(value);
    if (matched) return `${styles.cell} ${styles.cellMatched}`;

    if (selected?.side === side && selected.value === value) {
      return `${styles.cell} ${styles.cellSelected}`;
    }

    const isWrong =
      wrongFlash !== null &&
      ((side === 'left' && wrongFlash.word === value) || (side === 'right' && wrongFlash.match === value));
    if (isWrong) {
      return `${styles.cell} ${reduceMotion ? styles.cellWrongStatic : styles.cellWrongShake}`;
    }

    return styles.cell;
  }

  function renderCell(side: 'left' | 'right', value: string) {
    const matched = side === 'left' ? matchedWords.has(value) : matchedMatches.has(value);
    return (
      <motion.button
        key={value}
        type="button"
        data-side={side}
        data-value={value}
        className={cellClass(side, value)}
        onClick={() => handleTapCell(side, value)}
        // A fresh match pops once; a selected cell lifts slightly.
        animate={
          reduceMotion
            ? undefined
            : matched
              ? { scale: [1, 1.1, 1], y: 0 }
              : selected?.side === side && selected.value === value
                ? { scale: 1.04, y: -2 }
                : { scale: 1, y: 0 }
        }
        transition={{ duration: 0.35 }}
        whileTap={matched || reduceMotion ? undefined : { scale: 0.95 }}
      >
        {value}
      </motion.button>
    );
  }

  return (
    <motion.main
      className={styles.screen}
      variants={withReducedMotion(screenVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {!started ? (
        <>
          <button className={styles.exitButton} onClick={onExit} aria-label="Back to menu">
            ← Menu
          </button>
          <motion.div
            className={styles.introPanel}
            variants={withReducedMotion(zoomInVariants, reduceMotion)}
            initial="initial"
            animate="animate"
          >
            <p className={styles.introEmojis} aria-hidden="true">
              {INTRO_EMOJIS}
            </p>
            <h1 className={styles.introTitle}>Synonym Safari</h1>
            <p className={styles.introSubtitle}>
              {bank.label} · {config.difficulty}
            </p>
            <p className={styles.introDetail}>
              Match {round.length} pair{round.length === 1 ? '' : 's'} of words!
            </p>
            <motion.button
              className={styles.startButton}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sound.play('select');
                setStarted(true);
              }}
            >
              Start Matching
            </motion.button>
          </motion.div>
        </>
      ) : (
        <>
          <div className={styles.topBar}>
            <button className={styles.exitButton} onClick={onExit} aria-label="Back to menu">
              ← Menu
            </button>
            <span className={styles.categoryLabel}>
              {bank.label} · {config.difficulty}
            </span>
            <span className={styles.progress}>
              {matchedWords.size} / {round.length}
            </span>
          </div>

          <div className={styles.middleRegion}>
            <div className={styles.columns} ref={columnsRef}>
              {links.length > 0 && (
                <svg className={styles.links} aria-hidden="true">
                  {links.map((link) => (
                    <motion.line
                      key={link.word}
                      x1={link.x1}
                      y1={link.y1}
                      x2={link.x2}
                      y2={link.y2}
                      stroke="var(--color-success)"
                      strokeWidth={4}
                      strokeLinecap="round"
                      initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                  ))}
                </svg>
              )}
              <div className={styles.column}>{round.map((pair) => renderCell('left', pair.word))}</div>
              <div className={styles.column}>{rightColumn.map((pair) => renderCell('right', pair.match))}</div>
            </div>
          </div>

          {isRoundComplete ? (
            <div className={styles.continuePanel}>
              <Mascot mood="happy" reduceMotion={reduceMotion} size="sm" />
              <p className={styles.continueMessage}>All pairs matched!</p>
              <motion.button
                className={styles.continueButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onComplete({ pairsMatched: round.length, assisted })}
              >
                Continue
              </motion.button>
            </div>
          ) : (
            <div className={styles.bottomControls}>
              <button className={styles.assistButton} onClick={handleHint}>
                💡 Reveal a Pair
              </button>
            </div>
          )}
        </>
      )}
    </motion.main>
  );
}
