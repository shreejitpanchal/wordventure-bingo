import type { GameConfig, Streaks } from '../types';
import type { ModeMenuOptionsProps } from '../modes/types';
import { CALL_SECONDS_OPTIONS } from '../lib/caller';
import OptionSection from './OptionSection';

const PLAYER_OPTIONS = [
  { id: 1, label: 'Solo vs. Computer' },
  { id: 2, label: 'Pass & Play (2)' },
] as const;

const CALL_SPEED_OPTIONS = CALL_SECONDS_OPTIONS.map((s) => ({ id: s, label: `${s}s` }));

/** Bingo's extra menu sections: player count and auto-caller pace. */
export default function BingoMenuOptions({ config, onChange }: ModeMenuOptionsProps<GameConfig, Streaks>) {
  return (
    <>
      <OptionSection
        title="Players"
        options={PLAYER_OPTIONS}
        value={config.players}
        onChange={(players) => onChange({ ...config, players })}
      />
      <OptionSection
        title="Call Speed"
        options={CALL_SPEED_OPTIONS}
        value={config.callSeconds}
        onChange={(callSeconds) => onChange({ ...config, callSeconds })}
      />
    </>
  );
}
