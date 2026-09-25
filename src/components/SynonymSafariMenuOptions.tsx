import type { SynonymSafariConfig, SynonymSafariStats } from '../types';
import type { ModeMenuOptionsProps } from '../modes/types';
import { PAIR_COUNT_OPTIONS } from '../lib/synonymSafari';
import OptionSection from './OptionSection';

const OPTIONS = PAIR_COUNT_OPTIONS.map((n) => ({ id: n, label: `${n}` }));

/** Synonym Safari's extra menu section: pairs per round. */
export default function SynonymSafariMenuOptions({
  config,
  sound,
  reduceMotion,
  onChange,
}: ModeMenuOptionsProps<SynonymSafariConfig, SynonymSafariStats>) {
  return (
    <OptionSection
      title="Pair Count"
      options={OPTIONS}
      value={config.pairCount}
      onChange={(pairCount) => onChange({ ...config, pairCount })}
      sound={sound}
      reduceMotion={reduceMotion}
    />
  );
}
