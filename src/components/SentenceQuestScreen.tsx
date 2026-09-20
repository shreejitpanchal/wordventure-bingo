import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SentenceQuestConfig } from '../types';
import { SENTENCE_QUEST_BANKS } from '../data/sentenceQuestBanks';
import { generateRound, isCorrect, selectQuestionPool, splitSentence } from '../lib/sentenceQuest';
import { screenVariants, withReducedMotion } from '../lib/motion';
import styles from './SentenceQuestScreen.module.css';

interface Props {
  config: SentenceQuestConfig;
  /** Sentences the *previous* round (in this session) used, if any --
   * passed back up via `onRoundStart` so `App.tsx` can hand it to the next
   * round, keeping consecutive rounds from reusing the same questions. */
  excludeSentences: string[];
  onRoundStart: (sentences: string[]) => void;
  onComplete: (correctCount: number, totalCount: number) => void;
  onExit: () => void;
  reduceMotion: boolean;
}

export default function SentenceQuestScreen({
  config,
  excludeSentences,
  onRoundStart,
  onComplete,
  onExit,
  reduceMotion,
}: Props) {
  const bank = SENTENCE_QUEST_BANKS[config.category];
  const pool = useMemo(() => selectQuestionPool(bank.questions, config.difficulty), [bank, config.difficulty]);
  const [round] = useState(() =>
    generateRound(pool, Math.random, config.questionCount, new Set(excludeSentences)),
  );

  // Reports this round's questions back up to App.tsx once, right after
  // mount, so the *next* round knows what to avoid repeating -- see
  // generateRound's excludeSentences param.
  useEffect(() => {
    onRoundStart(round.map((q) => q.sentence));
  }, [round, onRoundStart]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const question = round[index];
  const { before, after } = splitSentence(question.sentence);
  const answered = selected !== null;
  const isLastQuestion = index === round.length - 1;

  function chooseOption(option: string) {
    if (answered) return;
    setSelected(option);
    if (isCorrect(question, option)) {
      setCorrectCount((c) => c + 1);
    }
  }

  function next() {
    if (isLastQuestion) {
      // correctCount already reflects this question's result -- chooseOption
      // updates it (and answered/selected, which is what gates this button
      // being clickable at all) in the same state update.
      onComplete(correctCount, round.length);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function optionClass(option: string): string {
    if (!answered) return styles.option;
    if (option === question.answer) return `${styles.option} ${styles.optionCorrect}`;
    if (option === selected) return `${styles.option} ${styles.optionWrong}`;
    return `${styles.option} ${styles.optionDisabled}`;
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
        <span className={styles.progress}>
          {index + 1} / {round.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className={styles.card}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <p className={styles.sentence}>
            {before}
            <span className={answered ? styles.blankFilled : styles.blank}>{answered ? selected : '_____'}</span>
            {after}
          </p>

          <div className={styles.options}>
            {question.options.map((option) => (
              <button key={option} className={optionClass(option)} onClick={() => chooseOption(option)} disabled={answered}>
                {option}
              </button>
            ))}
          </div>

          {answered && (
            <motion.div
              className={styles.feedback}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <p className={selected === question.answer ? styles.feedbackCorrect : styles.feedbackWrong}>
                {selected === question.answer ? 'Correct!' : `Not quite -- the answer is "${question.answer}."`}
              </p>
              <p className={styles.explanation}>{question.explanation}</p>
              <motion.button
                className={styles.nextButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={next}
              >
                {isLastQuestion ? 'See Results' : 'Next'}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  );
}
