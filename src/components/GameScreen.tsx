import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { BingoCard as BingoCardType, BingoResult, GameConfig } from '../types';
import type { ModeGameScreenProps } from '../modes/types';
import { WORD_BANKS } from '../data/wordBanks';
import { generateCard, markWord, selectWordPool } from '../lib/cardGeneration';
import { checkWin } from '../lib/winDetection';
import { buildCallQueue, clueForWord } from '../lib/caller';
import { screenVariants, withReducedMotion } from '../lib/motion';
import BingoCard, { type WrongTap } from './BingoCard';
import ClueBanner from './ClueBanner';
import styles from './GameScreen.module.css';

// Bingo has no "avoid last round's words" concept (a fresh 24-word card from
// a 24+ pool is already varied), so excludeItems/onRoundStart go unused.
type Props = ModeGameScreenProps<GameConfig, BingoResult>;

/** Fraction of the call timer after which the clue card starts to heartbeat
 * and a tick sounds -- the "hurry up" stretch. */
const URGENT_AT = 0.75;

export default function GameScreen({ config, context, rng, onComplete, onExit, reduceMotion }: Props) {
  const { sound } = context;
  const bank = WORD_BANKS[config.category];
  const wordEntries = useMemo(
    () => (config.category === 'freeplay' ? [...bank.words, ...context.freeplayWords] : bank.words),
    [bank, config.category, context.freeplayWords],
  );
  const pool = useMemo(
    () => selectWordPool(wordEntries, config.category, config.difficulty),
    [wordEntries, config.category, config.difficulty],
  );

  const [cards, setCards] = useState<BingoCardType[]>(() =>
    Array.from({ length: config.players }, () => generateCard(pool, rng)),
  );
  // Built once from the initial deal and never recomputed -- cards gets a new
  // array reference on every mark, so memoizing on `cards` would reshuffle
  // the whole call order on every tap instead of just advancing through it.
  const [callQueue] = useState(() => buildCallQueue(cards, rng));
  const [callIndex, setCallIndex] = useState(0);
  const [urgent, setUrgent] = useState(false);
  const [wrongTaps, setWrongTaps] = useState<(WrongTap | null)[]>(() => cards.map(() => null));

  const currentClue = useMemo(
    () => (callQueue.length ? clueForWord(callQueue[callIndex], pool, config.difficulty) : null),
    [callQueue, callIndex, pool, config.difficulty],
  );

  const paceMs = config.callSeconds * 1000;

  // Auto-caller: advances to the next clue on a timer. A correct tap also
  // advances callIndex directly, which resets this effect's timeout too --
  // one mechanism handles both the timed and the responsive-tap path.
  // The same effect arms the "hurry" beat: at URGENT_AT of the pace the
  // clue card starts to heartbeat and a tick plays.
  useEffect(() => {
    if (!callQueue.length) return;
    setUrgent(false);
    const urgentId = setTimeout(() => {
      setUrgent(true);
      sound.play('tick');
    }, paceMs * URGENT_AT);
    const id = setTimeout(() => {
      setCallIndex((i) => (i + 1) % callQueue.length);
    }, paceMs);
    return () => {
      clearTimeout(urgentId);
      clearTimeout(id);
    };
  }, [callIndex, callQueue.length, paceMs, sound]);

  function handleCellClick(cardIndex: number, word: string) {
    if (!currentClue) return;
    if (word !== currentClue.word) {
      const index = cards[cardIndex].cells.findIndex((c) => c.word === word);
      setWrongTaps((prev) => prev.map((t, i) => (i === cardIndex ? { index, token: Date.now() } : t)));
      sound.play('wrong');
      return;
    }

    const updatedCard = markWord(cards[cardIndex], word);
    const result = checkWin(updatedCard.cells);
    setCards((prev) => prev.map((c, i) => (i === cardIndex ? updatedCard : c)));

    if (result.won) {
      onComplete({
        patterns: result.patterns,
        winnerLabel: config.players === 2 ? `Player ${cardIndex + 1}` : undefined,
      });
      return;
    }
    sound.play('correct');
    setCallIndex((i) => (i + 1) % callQueue.length);
  }

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
      </div>

      <div className={styles.progressTrack}>
        <div
          key={callIndex}
          className={reduceMotion ? styles.progressFillStatic : styles.progressFill}
          style={{ animationDuration: `${paceMs}ms` }}
        />
      </div>

      <ClueBanner clue={currentClue} urgent={urgent} reduceMotion={reduceMotion} />

      <div className={config.players === 2 ? styles.cardsRow : styles.cardsSingle}>
        {cards.map((card, i) => (
          <BingoCard
            key={i}
            card={card}
            highlightedIndices={[]}
            wrongTap={wrongTaps[i]}
            reduceMotion={reduceMotion}
            onCellClick={(word) => handleCellClick(i, word)}
            label={config.players === 2 ? `Player ${i + 1}` : undefined}
          />
        ))}
      </div>
    </motion.main>
  );
}
