import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../types';
import { getSettings, saveSettings } from '../lib/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => getSettings());

  // Persist as an effect, not inside the setState updater: updaters must be
  // pure (React may call them twice under StrictMode), and a side effect
  // there is exactly the kind of thing that double-runs. Writing the initial
  // (merged-over-defaults) value back on mount is harmless and even useful --
  // it upgrades an older stored shape to the current one.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, updateSettings };
}
