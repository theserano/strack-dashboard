import type { Customer, Overview, OverviewParams, RevenuePoint, StatsInterval, TopCustomer, Transaction } from './types';

const DAY = 86400000;
const pad = (n: number) => String(n).padStart(2, '0');
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Date-only strings are local days; anything else is a timestamp truncated to its local day. */
const parseDay = (v: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : startOfDay(new Date(v));
};

const bucketStart = (d: Date, interval: StatsInterval): Date => {
  if (interval === 'day') return startOfDay(d);
  if (interval === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7)); // Monday
};

const nextBucket = (d: Date, interval: StatsInterval): Date =>
  interval === 'day' ? addDays(d, 1) : interval === 'week' ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1);

const labelOf = (d: Date, interval: StatsInterval): string =>
  d.toLocaleDateString('en-NG', interval === 'month' ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' });

const pct = (cur: number, prev: number): number | null =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;

const inRange = (t: Transaction, from: Date, toExclusive: Date) => {
  const ms = new Date(t.date).getTime();
  return ms >= from.getTime() && ms < toExclusive.getTime();
};

/** Ids of credits that have a successful refund debit (any date). They are not revenue. */
const refundedIds = (txns: Transaction[]) =>
  new Set(txns.filter((t) => t.status === 'successful' && t.type === 'debit' && t.refundOf).map((t) => t.refundOf!));

const isRevenue = (t: Transaction, refunded: Set<string>) =>
  t.status === 'successful' && t.type === 'credit' && !refunded.has(t.id);

const revenueOf = (txns: Transaction[], refunded: Set<string>) =>
  txns.reduce((s, t) => (isRevenue(t, refunded) ? s + t.amount : s), 0);

export function computeOverview(
  transactions: Transaction[],
  customers: Customer[],
  balance: number,
  params: OverviewParams = {},
  now: Date = new Date()
): Overview {
  const interval = params.interval ?? 'day';
  const to = params.to ? parseDay(params.to) : startOfDay(now);
  const from = params.from ? parseDay(params.from) : addDays(to, -29);
  const toExcl = addDays(to, 1);
  const days = Math.max(1, Math.round((toExcl.getTime() - from.getTime()) / DAY));
  const prevFrom = addDays(from, -days);

  const refunded = refundedIds(transactions);
  const cur = transactions.filter((t) => inRange(t, from, toExcl));
  const prev = transactions.filter((t) => inRange(t, prevFrom, from));

  const sums = new Map<string, number>();
  const topMap = new Map<string, TopCustomer>();
  const names = new Map(customers.map((c) => [c.id, c.name]));
  let totalPayouts = 0;
  let ok = 0;
  for (const t of cur) {
    if (t.status !== 'successful') continue;
    ok++;
    if (t.type === 'debit') {
      if (!t.refundOf) totalPayouts += t.amount; // refunds are netted out of revenue, not payouts
      continue;
    }
    if (refunded.has(t.id)) continue;
    const k = key(bucketStart(new Date(t.date), interval));
    sums.set(k, (sums.get(k) ?? 0) + t.amount);
    if (t.customerId && names.has(t.customerId)) {
      const c = topMap.get(t.customerId) ?? { customerId: t.customerId, name: names.get(t.customerId)!, total: 0, count: 0 };
      c.total += t.amount;
      c.count += 1;
      topMap.set(t.customerId, c);
    }
  }

  const revenueSeries: RevenuePoint[] = [];
  for (let b = bucketStart(from, interval); b < toExcl; b = nextBucket(b, interval)) {
    // The first bucket may start before the range (partial week/month): show it from `from`.
    const shown = b < from ? from : b;
    revenueSeries.push({ label: labelOf(shown, interval), date: key(shown), amount: sums.get(key(b)) ?? 0 });
  }

  const totalRevenue = revenueOf(cur, refunded);
  const prevRevenue = revenueOf(prev, refunded);
  return {
    balance,
    totalRevenue,
    totalPayouts,
    transactionCount: cur.length,
    customerCount: customers.length,
    successRate: cur.length === 0 ? 0 : Math.round((ok / cur.length) * 1000) / 10,
    previousPeriod: { totalRevenue: prevRevenue, transactionCount: prev.length },
    revenueChange: pct(totalRevenue, prevRevenue),
    countChange: pct(cur.length, prev.length),
    revenueSeries,
    topCustomers: [...topMap.values()]
      .sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5),
    recentTransactions: [...cur].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5),
  };
}

/** Adds the browser's IANA time zone so the server buckets days the way the user sees them. */
export const withTimeZone = (params: OverviewParams = {}, tz = Intl.DateTimeFormat().resolvedOptions().timeZone) => ({
  ...params,
  tz,
});
