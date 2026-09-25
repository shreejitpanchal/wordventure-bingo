import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SentenceQuestConfig, SentenceQuestResult } from '../types';
import type { ModeGameScreenProps } from '../modes/types';
import { SENTENCE_QUEST_BANKS } from '../data/sentenceQuestBanks';
import { generateRound, isCorrect, selectQuestionPool, splitSentence } from '../lib/sentenceQuest';
import { screenVariants, withReducedMotion } from '../lib/motion';
import Mascot from './Mascot';
import styles from './SentenceQuestScreen.module.css';

// excludeItems/onRoundStart carry the previous round's *sentences* (unique
// per bank by authoring convention) -- see generateRound's excludeSentences.
type Props = ModeGameScreenProps<SentenceQuestConfig, SentenceQuestResult>;

const BOUNCE = { scale: [1, 1.12, 0.96, 1.04, 1] };
const SHAKE = { x: [0, -8, 8, -6, 6, -3, 0] };

export default function SentenceQuestScreen({
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
  const bank = SENTENCE_QUEST_BANKS[config.category];
  const pool = useMemo(() => selectQuestionPool(bank.questions, config.difficulty), [bank, config.difficulty]);
  const [round] = useState(() => generateRound(pool, rng, config.questionCount, new Set(excludeItems)));

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
  const wasCorrect = answered && selected === question.answer;
  const isLastQuestion = index === round.length - 1;

  function chooseOption(option: string) {
    if (answered) return;
    setSelected(option);
    if (isCorrect(question, option)) {
      setCorrectCount((c) => c + 1);
      sound.play('correct');
    } else {
      sound.play('wrong');
    }
  }

  function next() {
    if (isLastQuestion) {
      // correctCount already reflects this question's result -- chooseOption
      // updates it (and answered/selected, which is what gates this button
      // being clickable at all) in the same state update.
      onComplete({ correctCount, totalCount: round.length });
      return;
    }
    sound.play('tap');
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function optionClass(option: string): string {
    if (!answered) return styles.option;
    if (option === question.answer) return `${styles.option} ${styles.optionCorrect}`;
    if (option === selected) return `${styles.option} ${styles.optionWrong}`;
    return `${styles.option} ${styles.optionDisabled}`;
  }

  // The right answer bounces, a wrong pick shakes, everything else sits still.
  function optionMotion(option: string) {
    if (!answered || reduceMotion) return { scale: 1, x: 0 };
    if (option === question.answer) return BOUNCE;
    if (option === selected) return SHAKE;
    return { scale: 1, x: 0 };
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
            {answered ? (
              <motion.span
                className={styles.blankFilled}
                initial={reduceMotion ? { y: 0, opacity: 1 } : { y: -14, opacity: 0, scale: 1.2 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              >
                {selected}
              </motion.span>
            ) : (
              <span className={`${styles.blank} ${reduceMotion ? '' : styles.blankWiggle}`}>_____</span>
            )}
            {after}
          </p>

          <div className={styles.options}>
            {question.options.map((option) => (
              <motion.button
                key={option}
                className={optionClass(option)}
                onClick={() => chooseOption(option)}
                disabled={answered}
                animate={optionMotion(option)}
                transition={{ duration: 0.45 }}
                whileTap={answered || reduceMotion ? undefined : { scale: 0.95 }}
              >
                {option}
              </motion.button>
            ))}
          </div>

          {answered && (
            <motion.div
              className={styles.feedback}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <Mascot
                mood={wasCorrect ? 'happy' : 'sad'}
                reduceMotion={reduceMotion}
                size="sm"
                bubble={
                  <>
                    <p className={wasCorrect ? styles.feedbackCorrect : styles.feedbackWrong}>
                      {wasCorrect ? 'Correct!' : `Not quite -- the answer is "${question.answer}."`}
                    </p>
                    <p className={styles.explanation}>{question.explanation}</p>
                  </>
                }
              />
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
