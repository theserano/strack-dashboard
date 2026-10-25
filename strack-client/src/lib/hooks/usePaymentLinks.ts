import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/lib/hook';
import { getDataSource } from '@/lib/data';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import type { ListResult, PaymentLink, PaymentLinkStatus } from '@/lib/data/types';

/** Loads one page of payment links for the current data mode; call refetch() after a mutation. */
export function usePaymentLinks(page: number, limit: number, search: string, status: PaymentLinkStatus | '') {
  const mode = useAppSelector((s) => s.auth.mode);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const [data, setData] = useState<ListResult<PaymentLink> | null>(null);
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
      .paymentLinks.list({ page, limit, search: search.trim() || undefined, status: status || undefined })
      .then((r) => id === latest.current && setData(r))
      .catch((e) => {
        if (id !== latest.current) return;
        setData(null);
        setError(getErrorMessage(e));
      })
      .finally(() => id === latest.current && setLoading(false));
  }, [mode, hydrated, page, limit, search, status, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: loading || !hydrated, refetch };
}

export interface LinkPayments {
  count: number;
  /** Kobo; undefined when more payments exist than were read. */
  total?: number;
}

/** Best-effort payment count and total per visible link; a link whose lookup fails is simply absent. */
export function useLinkPayments(links: PaymentLink[] | undefined, refreshKey: number) {
  const mode = useAppSelector((s) => s.auth.mode);
  const [stats, setStats] = useState<Record<string, LinkPayments>>({});
  const ids = (links ?? []).map((l) => l.id).join(',');

  useEffect(() => {
    setStats({});
    if (!ids) return;
    let cancelled = false;
    const tx = getDataSource(mode).transactions;
    ids.split(',').forEach((id) => {
      tx.list({ paymentLinkId: id, status: 'successful', type: 'credit', limit: 1000 })
        .then((r) => {
          if (cancelled) return;
          const complete = r.items.length >= r.total;
          const total = complete ? r.items.reduce((s, t) => s + t.amount, 0) : undefined;
          setStats((s) => ({ ...s, [id]: { count: r.total, total } }));
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [ids, mode, refreshKey]);

  return stats;
}
