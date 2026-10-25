import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/lib/hook';
import { getDataSource } from '@/lib/data';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import type { Settings, SettingsUpdate } from '@/lib/data/types';

/** Loads the account settings for the current data mode. update() saves a partial change and resolves to an error message or null. */
export function useSettings() {
  const mode = useAppSelector((s) => s.auth.mode);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setSettings(null);
    if (!hydrated) return;
    let current = true;
    setError(null);
    getDataSource(mode)
      .settings.get()
      .then((s) => current && setSettings(s))
      .catch((e) => current && setError(getErrorMessage(e)));
    return () => {
      current = false;
    };
  }, [mode, hydrated, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const update = useCallback(
    async (input: SettingsUpdate): Promise<string | null> => {
      if (savingRef.current) return 'A save is already in progress';
      savingRef.current = true;
      setSaving(true);
      try {
        setSettings(await getDataSource(mode).settings.update(input));
        return null;
      } catch (e) {
        return getErrorMessage(e);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [mode]
  );

  return { settings, error, saving, update, refetch };
}
