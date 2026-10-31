import type { WordScrambleConfig, WordScrambleStats } from '../types';
import type { ModeMenuOptionsProps } from '../modes/types';
import { WORD_COUNT_OPTIONS } from '../lib/wordScramble';
import OptionSection from './OptionSection';

const OPTIONS = WORD_COUNT_OPTIONS.map((n) => ({ id: n, label: `${n}` }));

/** Word Scramble's extra menu section: words per round. */
export default function WordScrambleMenuOptions({
  config,
  sound,
  reduceMotion,
  onChange,
}: ModeMenuOptionsProps<WordScrambleConfig, WordScrambleStats>) {
  return (
    <OptionSection
      title="Word Count"
      options={OPTIONS}
      value={config.wordCount}
      onChange={(wordCount) => onChange({ ...config, wordCount })}
      sound={sound}
      reduceMotion={reduceMotion}
    />
  );
}
