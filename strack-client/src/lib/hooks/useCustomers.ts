import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/lib/hook';
import { getDataSource } from '@/lib/data';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import type { Customer, ListResult } from '@/lib/data/types';

/** Loads one page of customers for the current data mode; call refetch() after a mutation. */
export function useCustomers(page: number, limit: number, search: string) {
  const mode = useAppSelector((s) => s.auth.mode);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const [data, setData] = useState<ListResult<Customer> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  // A different mode is a different dataset: drop the old rows straight away.
  useEffect(() => {
    setData(null);
  }, [mode]);

  useEffect(() => {
    if (!hydrated) return;
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    getDataSource(mode)
      .customers.list({ page, limit, search: search.trim() || undefined })
      .then((r) => id === latest.current && setData(r))
      .catch((e) => {
        if (id !== latest.current) return;
        setData(null);
        setError(getErrorMessage(e));
      })
      .finally(() => id === latest.current && setLoading(false));
  }, [mode, hydrated, page, limit, search, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: loading || !hydrated, refetch };
}
