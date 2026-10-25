'use client';

import { useState } from 'react';
import HeaderSearch from '@/lib/components/HeaderSearch';
import StatCard from '@/lib/components/StatCard';
import StatusBadge from '@/lib/components/StatusBadge';
import EmptyState from '@/lib/components/EmptyState';
import RevenueChart from '@/lib/components/RevenueChart';
import { useAppSelector } from '@/lib/hook';
import { useOverview } from '@/lib/hooks/useOverview';
import { formatMoney } from '@/lib/utils/money';
import type { StatsInterval } from '@/lib/data/types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Users,
  ArrowRightLeft,
  Receipt,
  CheckCircle2,
} from 'lucide-react';

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];
const INTERVALS: StatsInterval[] = ['day', 'week', 'month'];

const Skeleton = ({ className }: { className: string }) => (
  <div className={`rounded bg-[#F1F3F6] animate-pulse ${className}`} />
);

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.user);
  const [days, setDays] = useState(30);
  const [interval, setInterval] = useState<StatsInterval>('day');
  const { data, error, loading } = useOverview(days, interval);

  const hasRevenue = !!data && data.revenueSeries.some((p) => p.amount > 0);
  const money = (v?: number) => formatMoney(v ?? 0);

  return (
    <main>
      <HeaderSearch
        headerText={`Welcome${user ? `, ${user.firstName}` : ''}`}
        headerDescription="Here's an overview of your account"
      />

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-[#FBEAE9] px-4 py-3 text-sm text-[#9E0A05]">
          {error}
        </p>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <StatCard label="Total Balance" value={money(data?.balance)} icon={Wallet} loading={loading} hint="Available now" />
        <StatCard label="Revenue" value={money(data?.totalRevenue)} icon={ArrowDownLeft} change={data?.revenueChange} loading={loading} hint="No previous period to compare" />
        <StatCard label="Payouts & Refunds" value={money(data?.totalPayouts)} icon={ArrowUpRight} loading={loading} hint="Money paid out in this period" />
        <StatCard label="Transactions" value={String(data?.transactionCount ?? 0)} icon={Receipt} change={data?.countChange} loading={loading} hint="No previous period to compare" />
        <StatCard label="Success Rate" value={`${data?.successRate ?? 0}%`} icon={CheckCircle2} loading={loading} hint="Successful vs all transactions" />
        <StatCard label="Total Customers" value={String(data?.customerCount ?? 0)} icon={Users} loading={loading} hint="All time" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 border border-[#E1E4EA] rounded-xl bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-[#E1E4EA]">
            <div>
              <h3 className="text-base font-semibold text-[#0E121B]">Revenue Overview</h3>
              <p className="text-sm text-[#525866]">Successful payments received</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-[#E1E4EA] overflow-hidden" role="group" aria-label="Group by">
                {INTERVALS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={interval === i}
                    onClick={() => setInterval(i)}
                    className={`px-3 py-1.5 text-sm capitalize ${
                      interval === i ? 'bg-[#020C14] text-white' : 'bg-white text-[#525866] hover:bg-[#F7F9FC]'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <select
                aria-label="Date range"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="text-sm border border-[#E1E4EA] rounded-lg px-3 py-1.5 text-[#525866] bg-white"
              >
                {RANGES.map((r) => (
                  <option key={r.days} value={r.days}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-5">
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : hasRevenue ? (
              <RevenueChart series={data!.revenueSeries} />
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <EmptyState
                  icon={<ArrowRightLeft className="w-10 h-10 text-[#E1E4EA]" aria-hidden />}
                  title="No revenue in this period"
                  description="Your revenue chart will appear here once you receive payments"
                />
              </div>
            )}
          </div>
        </div>

        <div className="border border-[#E1E4EA] rounded-xl bg-white">
          <div className="p-5 border-b border-[#E1E4EA]">
            <h3 className="text-base font-semibold text-[#0E121B]">Top Customers</h3>
            <p className="text-sm text-[#525866]">By revenue in this period</p>
          </div>
          {loading ? (
            <div className="p-5 flex flex-col gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : data && data.topCustomers.length > 0 ? (
            <ol className="p-5 flex flex-col gap-4">
              {data.topCustomers.map((c, i) => (
                <li key={c.customerId} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#F7F9FC] text-xs font-medium text-[#525866] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0E121B]">{c.name}</p>
                    <p className="text-xs text-[#525866]">
                      {c.count} payment{c.count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[#0E121B]">{formatMoney(c.total)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No customers yet" description="Customers who pay you will show up here" />
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 border border-[#E1E4EA] rounded-xl bg-white">
          <div className="flex items-center justify-between p-5 border-b border-[#E1E4EA]">
            <div>
              <h3 className="text-base font-semibold text-[#0E121B]">Recent Transactions</h3>
              <p className="text-sm text-[#525866]">Your latest transactions in this period</p>
            </div>
          </div>
          {loading ? (
            <div className="p-5 flex flex-col gap-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data && data.recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E1E4EA]">
                    {['Reference', 'Description', 'Amount', 'Status', 'Date'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-medium text-[#525866] px-5 py-3 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-[#E1E4EA] last:border-b-0">
                      <td className="px-5 py-4 text-sm text-[#0E121B] font-medium">{txn.reference}</td>
                      <td className="px-5 py-4 text-sm text-[#525866]">{txn.description ?? '—'}</td>
                      <td className="px-5 py-4 text-sm text-[#0E121B] font-medium whitespace-nowrap">
                        {txn.type === 'debit' ? '-' : ''}
                        {formatMoney(txn.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={txn.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-[#525866] whitespace-nowrap">
                        {new Date(txn.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No transactions yet" description="Transactions in this period will appear here" />
          )}
        </div>

        <div className="border border-[#E1E4EA] rounded-xl bg-white self-start">
          <div className="p-5 border-b border-[#E1E4EA]">
            <h3 className="text-base font-semibold text-[#0E121B]">Quick Actions</h3>
          </div>
          <div className="p-5 flex flex-col gap-3">
            {[
              { label: 'Send Money', icon: ArrowUpRight, color: '#020C14' },
              { label: 'Request Payment', icon: ArrowDownLeft, color: '#020C14' },
              { label: 'View Customers', icon: Users, color: '#020C14' },
            ].map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#E1E4EA] hover:bg-[#F7F9FC] transition-colors text-left w-full"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${action.color}10` }}
                  >
                    <ActionIcon className="w-4 h-4" style={{ color: action.color }} />
                  </div>
                  <span className="text-sm font-medium text-[#0E121B]">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
