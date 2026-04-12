'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import { useAppSelector } from '@/lib/hook';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Users,
  ArrowRightLeft,
} from 'lucide-react';

const statsData = [
  {
    label: 'Total Balance',
    value: '₦0.00',
    change: '+0%',
    icon: Wallet,
    trend: 'up' as const,
  },
  {
    label: 'Total Income',
    value: '₦0.00',
    change: '+0%',
    icon: ArrowDownLeft,
    trend: 'up' as const,
  },
  {
    label: 'Total Expenses',
    value: '₦0.00',
    change: '0%',
    icon: ArrowUpRight,
    trend: 'neutral' as const,
  },
  {
    label: 'Total Customers',
    value: '0',
    change: '+0%',
    icon: Users,
    trend: 'up' as const,
  },
];

const recentTransactions = [
  {
    id: 'TXN-0001',
    description: 'No transactions yet',
    amount: '—',
    status: 'pending' as const,
    date: '—',
    type: 'credit' as const,
  },
];

const statusStyles = {
  successful: 'bg-[#E7F6EC] text-[#036B26]',
  pending: 'bg-[#FFF4E5] text-[#AD6F10]',
  failed: 'bg-[#FBEAE9] text-[#9E0A05]',
};

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.user);

  return (
    <main>
      <HeaderSearch
        headerText={`Welcome${user ? `, ${user.firstName}` : ''}`}
        headerDescription="Here's an overview of your account"
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="border border-[#E1E4EA] rounded-xl p-5 flex flex-col gap-3 bg-white"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#525866]">{stat.label}</span>
                <div className="w-9 h-9 rounded-lg bg-[#F7F9FC] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#525866]" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-[#0E121B]">{stat.value}</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#036B26]" />
                <span className="text-xs text-[#036B26]">{stat.change}</span>
                <span className="text-xs text-[#525866]">vs last month</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 border border-[#E1E4EA] rounded-xl bg-white">
          <div className="flex items-center justify-between p-5 border-b border-[#E1E4EA]">
            <div>
              <h3 className="text-base font-semibold text-[#0E121B]">Revenue Overview</h3>
              <p className="text-sm text-[#525866]">Monthly income & expenses</p>
            </div>
            <select className="text-sm border border-[#E1E4EA] rounded-lg px-3 py-1.5 text-[#525866] bg-white">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="p-5 flex items-center justify-center h-[250px]">
            <div className="text-center">
              <ArrowRightLeft className="w-10 h-10 text-[#E1E4EA] mx-auto mb-3" />
              <p className="text-sm text-[#525866]">No transaction data yet</p>
              <p className="text-xs text-[#99A0AE] mt-1">
                Your revenue chart will appear here once you start transacting
              </p>
            </div>
          </div>
        </div>

        <div className="border border-[#E1E4EA] rounded-xl bg-white">
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

      <section className="mt-8 border border-[#E1E4EA] rounded-xl bg-white">
        <div className="flex items-center justify-between p-5 border-b border-[#E1E4EA]">
          <div>
            <h3 className="text-base font-semibold text-[#0E121B]">Recent Transactions</h3>
            <p className="text-sm text-[#525866]">Your latest transactions</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E1E4EA]">
                {['Transaction ID', 'Description', 'Amount', 'Status', 'Date'].map((h) => (
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
              {recentTransactions.map((txn) => (
                <tr key={txn.id} className="border-b border-[#E1E4EA] last:border-b-0">
                  <td className="px-5 py-4 text-sm text-[#0E121B] font-medium">{txn.id}</td>
                  <td className="px-5 py-4 text-sm text-[#525866]">{txn.description}</td>
                  <td className="px-5 py-4 text-sm text-[#0E121B] font-medium">{txn.amount}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[txn.status]}`}
                    >
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#525866]">{txn.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
