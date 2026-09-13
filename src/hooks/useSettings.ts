import { useCallback, useState } from 'react';
import type { Settings } from '../types';
import { getSettings, saveSettings } from '../lib/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => getSettings());

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
