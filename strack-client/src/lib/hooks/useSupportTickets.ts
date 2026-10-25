import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/lib/hook';
import { getDataSource } from '@/lib/data';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import type { ListParams, ListResult, SupportTicket } from '@/lib/data/types';

/** Loads one page of support tickets for the current data mode; call refetch() after a mutation. */
export function useSupportTickets(params: ListParams) {
  const mode = useAppSelector((s) => s.auth.mode);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const [data, setData] = useState<ListResult<SupportTicket> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    setData(null);
  }, [mode]);

  useEffect(() => {
    if (!hydrated) return;
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    getDataSource(mode)
      .support.list(JSON.parse(key))
      .then((r) => id === latest.current && setData(r))
      .catch((e) => {
        if (id !== latest.current) return;
        setData(null);
        setError(getErrorMessage(e));
      })
      .finally(() => id === latest.current && setLoading(false));
  }, [mode, hydrated, key, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: loading || !hydrated, refetch };
}
