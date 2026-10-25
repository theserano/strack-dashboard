import { Types } from 'mongoose';
import { TransactionModel } from '../transaction/transaction.schema';
import { CustomerModel } from '../customer/customer.schema';
import { HttpError } from '../../utils/httpError';
import type { OverviewQuery } from './stats.validation';

// Response shape mirrors the client Overview type (strack-client/src/lib/data/types.ts).
// Amounts are integer kobo. Days are UTC days (no timezone parameter yet).
const DAY = 86400000;
type Interval = OverviewQuery['interval'];

const dayStart = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const bucketStart = (d: Date, interval: Interval): Date => {
  if (interval === 'day') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (interval === 'month') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY); // Monday
};

const nextBucket = (d: Date, interval: Interval): Date =>
  interval === 'day'
    ? new Date(d.getTime() + DAY)
    : interval === 'week'
      ? new Date(d.getTime() + 7 * DAY)
      : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

const labelOf = (d: Date, interval: Interval) =>
  d.toLocaleDateString(
    'en-NG',
    interval === 'month'
      ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
      : { month: 'short', day: 'numeric', timeZone: 'UTC' }
  );

const pct = (cur: number, prev: number): number | null =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;

const periodStats = (from: Date, toExcl: Date) => [
  { $match: { createdAt: { $gte: from, $lt: toExcl } } },
  {
    $group: {
      _id: null,
      count: { $sum: 1 },
      ok: { $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] } },
      revenue: {
        $sum: { $cond: [{ $and: [{ $eq: ['$status', 'successful'] }, { $eq: ['$type', 'credit'] }] }, '$amount', 0] },
      },
      payouts: {
        $sum: { $cond: [{ $and: [{ $eq: ['$status', 'successful'] }, { $eq: ['$type', 'debit'] }] }, '$amount', 0] },
      },
    },
  },
];

export const getOverviewService = async (userId: string, query: OverviewQuery) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  const owner = new Types.ObjectId(userId);
  const interval = query.interval;

  const todayStart = bucketStart(new Date(), 'day');
  const toDay = query.to ? dayStart(query.to) : todayStart;
  const fromDay = query.from ? dayStart(query.from) : new Date(toDay.getTime() - 29 * DAY);
  const toExcl = new Date(toDay.getTime() + DAY);
  const days = Math.round((toExcl.getTime() - fromDay.getTime()) / DAY);
  const prevFrom = new Date(fromDay.getTime() - days * DAY);
  if (days > 3660) throw new HttpError(400, 'Date range is too large');

  const inPeriod = { createdAt: { $gte: fromDay, $lt: toExcl } };
  const revenueMatch = { ...inPeriod, status: 'successful', type: 'credit' };

  const [[facets], customerCount] = await Promise.all([
    TransactionModel.aggregate([
      { $match: { owner } },
      {
        $facet: {
          balance: [
            { $match: { status: 'successful' } },
            { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }] } } } },
          ],
          current: periodStats(fromDay, toExcl),
          previous: periodStats(prevFrom, fromDay),
          series: [
            { $match: revenueMatch },
            {
              $group: {
                _id: { $dateTrunc: { date: '$createdAt', unit: interval, startOfWeek: 'monday', timezone: 'UTC' } },
                amount: { $sum: '$amount' },
              },
            },
          ],
          top: [
            { $match: { ...revenueMatch, customerId: { $exists: true } } },
            { $group: { _id: '$customerId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $lookup: { from: CustomerModel.collection.name, localField: '_id', foreignField: '_id', as: 'customer' } },
            { $unwind: '$customer' },
            { $match: { 'customer.owner': owner } },
            { $sort: { total: -1, count: -1, 'customer.name': 1 } },
            { $limit: 5 },
            { $project: { _id: 0, customerId: { $toString: '$_id' }, name: '$customer.name', total: 1, count: 1 } },
          ],
          recent: [{ $match: inPeriod }, { $sort: { createdAt: -1 } }, { $limit: 5 }],
        },
      },
    ]),
    CustomerModel.countDocuments({ owner }),
  ]);

  const cur = facets.current[0] ?? { count: 0, ok: 0, revenue: 0, payouts: 0 };
  const prev = facets.previous[0] ?? { count: 0, revenue: 0 };

  const sums = new Map<string, number>(
    facets.series.map((s: { _id: Date; amount: number }) => [isoDay(s._id), s.amount])
  );
  const revenueSeries: { label: string; date: string; amount: number }[] = [];
  for (let b = bucketStart(fromDay, interval); b < toExcl; b = nextBucket(b, interval)) {
    revenueSeries.push({ label: labelOf(b, interval), date: isoDay(b), amount: sums.get(isoDay(b)) ?? 0 });
  }

  const idOf = (v?: Types.ObjectId) => (v ? String(v) : undefined);
  return {
    balance: facets.balance[0]?.total ?? 0,
    totalRevenue: cur.revenue,
    totalPayouts: cur.payouts,
    transactionCount: cur.count,
    customerCount,
    successRate: cur.count === 0 ? 0 : Math.round((cur.ok / cur.count) * 1000) / 10,
    previousPeriod: { totalRevenue: prev.revenue, transactionCount: prev.count },
    revenueChange: pct(cur.revenue, prev.revenue),
    countChange: pct(cur.count, prev.count),
    revenueSeries,
    topCustomers: facets.top,
    recentTransactions: facets.recent.map((t: any) => ({
      id: String(t._id),
      type: t.type,
      amount: t.amount,
      status: t.status,
      reference: t.reference,
      channel: t.channel,
      description: t.description,
      date: t.createdAt.toISOString(),
      customerId: idOf(t.customerId),
      paymentLinkId: idOf(t.paymentLinkId),
      payoutId: idOf(t.payoutId),
      note: t.note,
      refundOf: idOf(t.refundOf),
    })),
  };
};
