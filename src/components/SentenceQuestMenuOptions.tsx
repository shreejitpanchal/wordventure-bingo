import type { SentenceQuestConfig, SentenceQuestStats } from '../types';
import type { ModeMenuOptionsProps } from '../modes/types';
import { QUESTION_COUNT_OPTIONS } from '../lib/sentenceQuest';
import OptionSection from './OptionSection';

const OPTIONS = QUESTION_COUNT_OPTIONS.map((n) => ({ id: n, label: `${n}` }));

/** Sentence Quest's extra menu section: questions per round. */
export default function SentenceQuestMenuOptions({
  config,
  onChange,
}: ModeMenuOptionsProps<SentenceQuestConfig, SentenceQuestStats>) {
  return (
    <OptionSection
      title="Question Count"
      options={OPTIONS}
      value={config.questionCount}
      onChange={(questionCount) => onChange({ ...config, questionCount })}
    />
  );
}
