import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { BingoCard as BingoCardType, BingoResult, GameConfig } from '../types';
import type { ModeGameScreenProps } from '../modes/types';
import { WORD_BANKS } from '../data/wordBanks';
import { generateCard, markWord, selectWordPool } from '../lib/cardGeneration';
import { checkWin } from '../lib/winDetection';
import { buildCallQueue, clueForWord } from '../lib/caller';
import { screenVariants, withReducedMotion } from '../lib/motion';
import BingoCard from './BingoCard';
import ClueBanner from './ClueBanner';
import styles from './GameScreen.module.css';

// Bingo has no "avoid last round's words" concept (a fresh 24-word card from
// a 24+ pool is already varied), so excludeItems/onRoundStart go unused.
type Props = ModeGameScreenProps<GameConfig, BingoResult>;

export default function GameScreen({ config, context, onComplete, onExit, reduceMotion }: Props) {
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
    Array.from({ length: config.players }, () => generateCard(pool)),
  );
  // Built once from the initial deal and never recomputed -- cards gets a new
  // array reference on every mark, so memoizing on `cards` would reshuffle
  // the whole call order on every tap instead of just advancing through it.
  const [callQueue] = useState(() => buildCallQueue(cards));
  const [callIndex, setCallIndex] = useState(0);

  const currentClue = useMemo(
    () => (callQueue.length ? clueForWord(callQueue[callIndex], pool, config.difficulty) : null),
    [callQueue, callIndex, pool, config.difficulty],
  );

  const paceMs = config.callSeconds * 1000;

  // Auto-caller: advances to the next clue on a timer. A correct tap also
  // advances callIndex directly, which resets this effect's timeout too --
  // one mechanism handles both the timed and the responsive-tap path.
  useEffect(() => {
    if (!callQueue.length) return;
    const id = setTimeout(() => {
      setCallIndex((i) => (i + 1) % callQueue.length);
    }, paceMs);
    return () => clearTimeout(id);
  }, [callIndex, callQueue.length, paceMs]);

  function handleCellClick(cardIndex: number, word: string) {
    if (!currentClue || word !== currentClue.word) return;

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

      <ClueBanner clue={currentClue} reduceMotion={reduceMotion} />

      <div className={config.players === 2 ? styles.cardsRow : styles.cardsSingle}>
        {cards.map((card, i) => (
          <BingoCard
            key={i}
            card={card}
            highlightedIndices={[]}
            onCellClick={(word) => handleCellClick(i, word)}
            label={config.players === 2 ? `Player ${i + 1}` : undefined}
          />
        ))}
      </div>
    </motion.main>
  );
}
