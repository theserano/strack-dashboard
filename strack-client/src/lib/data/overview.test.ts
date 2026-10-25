import { describe, expect, it } from 'vitest';
import { computeOverview, withTimeZone } from './overview';
import type { Customer, Transaction } from './types';

const now = new Date(2026, 9, 25, 12); // Sun 25 Oct 2026, local
const at = (m: number, d: number, h = 10) => new Date(2026, m, d, h).toISOString();
let n = 0;
const tx = (o: Partial<Transaction>): Transaction => ({
  id: `t${n++}`, type: 'credit', amount: 1000, status: 'successful', reference: 'r', date: at(9, 20), ...o,
});
const cust = (id: string, name: string): Customer => ({ id, name, email: '', createdAt: at(0, 1) });
const P = { from: '2026-10-19', to: '2026-10-25' }; // 7 days; previous 12-18 Oct

describe('computeOverview', () => {
  it('revenue counts only successful credits in range', () => {
    const o = computeOverview(
      [
        tx({ amount: 500 }),
        tx({ amount: 700, status: 'failed' }),
        tx({ amount: 900, status: 'pending' }),
        tx({ amount: 300, type: 'debit' }),
        tx({ amount: 5000, date: at(9, 10) }),
      ],
      [], 0, P, now
    );
    expect(o.totalRevenue).toBe(500);
    expect(o.totalPayouts).toBe(300);
    expect(o.transactionCount).toBe(4);
    expect(o.successRate).toBe(50);
  });

  it('includes both boundary days (local) and excludes outside', () => {
    const o = computeOverview(
      [tx({ date: at(9, 19, 0) }), tx({ date: new Date(2026, 9, 25, 23, 59).toISOString() }), tx({ date: new Date(2026, 9, 18, 23, 59).toISOString() })],
      [], 0, P, now
    );
    expect(o.transactionCount).toBe(2);
  });

  it('fills empty buckets with 0 and keys by day', () => {
    const o = computeOverview([tx({ amount: 400, date: at(9, 21) })], [], 0, P, now);
    expect(o.revenueSeries).toHaveLength(7);
    expect(o.revenueSeries.map((p) => p.amount)).toEqual([0, 0, 400, 0, 0, 0, 0]);
    expect(o.revenueSeries[0].date).toBe('2026-10-19');
  });

  it('groups by Monday week and by month', () => {
    const txns = [tx({ amount: 1, date: at(9, 5) }), tx({ amount: 2, date: at(9, 11) }), tx({ amount: 4, date: at(9, 12) }), tx({ amount: 8, date: at(8, 30) })];
    const w = computeOverview(txns, [], 0, { from: '2026-10-01', to: '2026-10-25', interval: 'week' }, now);
    expect(w.revenueSeries.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-19']);
    expect(w.revenueSeries.map((p) => p.amount)).toEqual([0, 3, 4, 0]);
    const m = computeOverview(txns, [], 0, { from: '2026-08-10', to: '2026-10-25', interval: 'month' }, now);
    expect(m.revenueSeries.map((p) => [p.date, p.amount])).toEqual([['2026-08-10', 0], ['2026-09-01', 8], ['2026-10-01', 7]]);
  });

  it('top customers: ordered by total, max 5, only successful credits', () => {
    const cs = 'abcdefg'.split('').map((c) => cust(c, c.toUpperCase()));
    const txns = [
      ...cs.map((c, i) => tx({ customerId: c.id, amount: (i + 1) * 100 })),
      tx({ customerId: 'a', amount: 99999, status: 'failed' }),
      tx({ customerId: 'a', amount: 99999, type: 'debit' }),
      tx({ customerId: 'g', amount: 50 }),
    ];
    const top = computeOverview(txns, cs, 0, P, now).topCustomers;
    expect(top.map((t) => t.customerId)).toEqual(['g', 'f', 'e', 'd', 'c']);
    expect(top[0]).toEqual({ customerId: 'g', name: 'G', total: 750, count: 2 });
  });

  it('period change compares with the previous equal-length period; null when previous is 0', () => {
    const txns = [tx({ amount: 3000 }), tx({ amount: 1000, date: at(9, 15) }), tx({ amount: 1000, date: at(9, 16) }), tx({ amount: 1000, date: at(9, 18, 23) }), tx({ amount: 1000, date: at(9, 11, 23) })];
    const o = computeOverview(txns, [], 0, P, now);
    expect(o.previousPeriod).toEqual({ totalRevenue: 3000, transactionCount: 3 });
    expect(o.revenueChange).toBe(0);
    expect(o.countChange).toBe(-66.7);
    expect(computeOverview([tx({})], [], 0, P, now).revenueChange).toBeNull();
  });

  it('recent transactions: newest first, max 5; balance and customers pass through; defaults to 30 days', () => {
    const txns = Array.from({ length: 8 }, (_, i) => tx({ date: at(9, 10 + i) }));
    const o = computeOverview(txns, [cust('a', 'A')], 1234, {}, now);
    expect(o.recentTransactions).toHaveLength(5);
    expect(o.recentTransactions[0].date).toBe(at(9, 17));
    expect(o.balance).toBe(1234);
    expect(o.customerCount).toBe(1);
    expect(o.revenueSeries).toHaveLength(30);
    expect(computeOverview([], [], 0, {}, now).successRate).toBe(0);
  });

  it('nets refunded credits out of revenue and top customers; refunds are not payouts', () => {
    const o = computeOverview(
      [
        tx({ id: 'c1', amount: 1000, customerId: 'a' }),
        tx({ id: 'c2', amount: 400, customerId: 'a' }),
        tx({ type: 'debit', amount: 1000, refundOf: 'c1' }),
        tx({ type: 'debit', amount: 250 }),
        tx({ type: 'debit', amount: 99, refundOf: 'c2', status: 'failed' }), // failed refund: c2 stays revenue
      ],
      [cust('a', 'Ada')], 0, P, now
    );
    expect(o.totalRevenue).toBe(400);
    expect(o.totalPayouts).toBe(250);
    expect(o.topCustomers).toEqual([{ customerId: 'a', name: 'Ada', total: 400, count: 1 }]);
  });

  it('clamps the first partial week and month bucket to the range start', () => {
    const w = computeOverview([tx({ date: at(9, 21) })], [], 0, { from: '2026-10-21', to: '2026-10-25', interval: 'week' }, now);
    expect(w.revenueSeries[0].date).toBe('2026-10-21');
    expect(w.revenueSeries[0].amount).toBe(1000);
    const m = computeOverview([], [], 0, { from: '2026-10-10', to: '2026-10-25', interval: 'month' }, now);
    expect(m.revenueSeries[0].date).toBe('2026-10-10');
    expect(m.revenueSeries[0].label).toBe(new Date(2026, 9, 10).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }));
  });
});

describe('withTimeZone', () => {
  it('adds the tz and keeps the other params', () => {
    expect(withTimeZone({ from: '2026-10-01', interval: 'week' }, 'Africa/Lagos')).toEqual({
      from: '2026-10-01', interval: 'week', tz: 'Africa/Lagos',
    });
    expect(withTimeZone({}).tz).toMatch(/\w/);
  });
});
