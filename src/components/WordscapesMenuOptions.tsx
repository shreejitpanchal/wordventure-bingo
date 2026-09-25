import type { WordscapesConfig, WordscapesStats } from '../types';
import type { ModeMenuOptionsProps } from '../modes/types';
import { MAX_WORD_COUNT, MIN_WORD_COUNT } from '../lib/wordscapes/gridGeneration';
import OptionSection from './OptionSection';

// Every integer in range (not a curated list like Sentence Quest's
// QUESTION_COUNT_OPTIONS) -- the range is small enough to show them all.
const WORD_COUNT_OPTIONS = Array.from({ length: MAX_WORD_COUNT - MIN_WORD_COUNT + 1 }, (_, i) => {
  const n = MIN_WORD_COUNT + i;
  return { id: n, label: `${n}` };
});

/** Wordscapes' extra menu section: how many words the puzzle should target. */
export default function WordscapesMenuOptions({ config, onChange }: ModeMenuOptionsProps<WordscapesConfig, WordscapesStats>) {
  return (
    <OptionSection
      title="Word Count"
      options={WORD_COUNT_OPTIONS}
      value={config.wordCount}
      onChange={(wordCount) => onChange({ ...config, wordCount })}
    />
  );
}
