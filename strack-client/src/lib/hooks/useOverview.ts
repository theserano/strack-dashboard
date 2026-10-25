import { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/hook';
import { getDataSource } from '@/lib/data';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import type { Overview, StatsInterval } from '@/lib/data/types';

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local-day range ending today and covering `days` days. */
export const lastDays = (days: number, now = new Date()) => ({
  from: localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))),
  to: localDay(now),
});

/** Loads the Overview for the current data mode; reloads when the range or interval changes. */
export function useOverview(days: number, interval: StatsInterval) {
  const mode = useAppSelector((s) => s.auth.mode);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDataSource(mode)
      .stats.overview({ ...lastDays(days), interval })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode, hydrated, days, interval]);

  return { data, error, loading: loading || !hydrated };
}
