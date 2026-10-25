import { Types } from 'mongoose';
import { TransactionModel } from '../transaction/transaction.schema';
import { CustomerModel } from '../customer/customer.schema';
import { HttpError } from '../../utils/httpError';
import type { OverviewQuery } from './stats.validation';

// Response shape mirrors the client Overview type (strack-client/src/lib/data/types.ts).
// Amounts are integer kobo. Days are calendar days in the requested IANA time zone (`tz`, default
// Africa/Lagos). Revenue/Top customers are net of refunds, payouts exclude refunds (see client Overview doc).
// Requires MongoDB >= 5.0 ($dateTrunc).
const DAY = 86400000;
type Interval = OverviewQuery['interval'];

// Calendar days are carried as UTC-midnight Dates ("cal"); `bound` maps one to the real instant
// at which that day starts in `tz`.
const dayStart = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const tzOffsetMs = (at: Date, tz: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(at);
  const v = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second')) - Math.floor(at.getTime() / 1000) * 1000;
};

export const bound = (cal: Date, tz: string): Date => {
  const first = new Date(cal.getTime() - tzOffsetMs(cal, tz));
  return new Date(cal.getTime() - tzOffsetMs(first, tz)); // second pass settles DST edges
};

const todayIn = (tz: string): Date => {
  const now = new Date();
  const wall = now.getTime() + tzOffsetMs(now, tz); // local wall clock read as UTC
  return new Date(wall - (((wall % DAY) + DAY) % DAY));
};
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

const periodStats = (from: Date, toExcl: Date, refunded: Types.ObjectId[]) => [
  { $match: { createdAt: { $gte: from, $lt: toExcl } } },
  {
    $group: {
      _id: null,
      count: { $sum: 1 },
      ok: { $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] } },
      // Revenue is net of refunds: credits that have a successful refund debit are excluded.
      revenue: {
        $sum: {
          $cond: [
            { $and: [{ $eq: ['$status', 'successful'] }, { $eq: ['$type', 'credit'] }, { $not: [{ $in: ['$_id', refunded] }] }] },
            '$amount',
            0,
          ],
        },
      },
      // Payouts exclude refund debits.
      payouts: {
        $sum: {
          $cond: [
            { $and: [{ $eq: ['$status', 'successful'] }, { $eq: ['$type', 'debit'] }, { $eq: [{ $ifNull: ['$refundOf', null] }, null] }] },
            '$amount',
            0,
          ],
        },
      },
    },
  },
];

export const getOverviewService = async (userId: string, query: OverviewQuery) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  const owner = new Types.ObjectId(userId);
  const interval = query.interval;

  const tz = query.tz;

  const toCal = query.to ? dayStart(query.to) : todayIn(tz);
  const fromCal = query.from ? dayStart(query.from) : new Date(toCal.getTime() - 29 * DAY);
  if (fromCal > toCal) throw new HttpError(400, 'from must be on or before to');
  const toExclCal = new Date(toCal.getTime() + DAY);
  const days = Math.round((toExclCal.getTime() - fromCal.getTime()) / DAY);
  if (days > 3660) throw new HttpError(400, 'Date range is too large');
  const prevFromCal = new Date(fromCal.getTime() - days * DAY);
  const fromDay = bound(fromCal, tz);
  const toExcl = bound(toExclCal, tz);
  const prevFrom = bound(prevFromCal, tz);

  // Credits with a successful refund debit are not revenue. (distinct is capped at 16MB; fine for now.)
  const refunded: Types.ObjectId[] = await TransactionModel.distinct('refundOf', {
    owner, status: 'successful', type: 'debit', refundOf: { $exists: true },
  });

  const inPeriod = { createdAt: { $gte: fromDay, $lt: toExcl } };
  const revenueMatch = { ...inPeriod, status: 'successful', type: 'credit', _id: { $nin: refunded } };

  const [[facets], [balanceRow], customerCount] = await Promise.all([
    TransactionModel.aggregate([
      // Narrow to the period (and its previous period) before faceting; balance is separate below.
      { $match: { owner, createdAt: { $gte: prevFrom, $lt: toExcl } } },
      {
        $facet: {
          current: periodStats(fromDay, toExcl, refunded),
          previous: periodStats(prevFrom, fromDay, refunded),
          series: [
            { $match: revenueMatch },
            {
              $group: {
                // Local calendar date (in tz) of the bucket start, e.g. "2026-10-19".
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    timezone: tz,
                    date: { $dateTrunc: { date: '$createdAt', unit: interval, startOfWeek: 'monday', timezone: tz } },
                  },
                },
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
    TransactionModel.aggregate([
      { $match: { owner, status: 'successful' } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }] } } } },
    ]),
    CustomerModel.countDocuments({ owner }),
  ]);

  const cur = facets.current[0] ?? { count: 0, ok: 0, revenue: 0, payouts: 0 };
  const prev = facets.previous[0] ?? { count: 0, revenue: 0 };

  const sums = new Map<string, number>(
    facets.series.map((s: { _id: string; amount: number }) => [s._id, s.amount])
  );
  const revenueSeries: { label: string; date: string; amount: number }[] = [];
  for (let b = bucketStart(fromCal, interval); b < toExclCal; b = nextBucket(b, interval)) {
    // The first bucket may start before the range (partial week/month): show it from `from`.
    const shown = b < fromCal ? fromCal : b;
    revenueSeries.push({ label: labelOf(shown, interval), date: isoDay(shown), amount: sums.get(isoDay(b)) ?? 0 });
  }

  const idOf = (v?: Types.ObjectId) => (v ? String(v) : undefined);
  return {
    balance: balanceRow?.total ?? 0,
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
