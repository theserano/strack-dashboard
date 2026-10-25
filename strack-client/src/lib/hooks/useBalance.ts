import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/lib/hook';
import { getDataSource } from '@/lib/data';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import { lastDays } from './useOverview';

/** All-time available balance (kobo) from the overview stats; call refetch() after a payout. */
export function useBalance() {
  const mode = useAppSelector((s) => s.auth.mode);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    setBalance(null);
  }, [mode]);

  useEffect(() => {
    if (!hydrated) return;
    const id = ++latest.current;
    setError(null);
    getDataSource(mode)
      .stats.overview({ ...lastDays(1), interval: 'day' })
      .then((o) => id === latest.current && setBalance(o.balance))
      .catch((e) => {
        if (id !== latest.current) return;
        setBalance(null);
        setError(getErrorMessage(e));
      });
  }, [mode, hydrated, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { balance, error, refetch };
}
