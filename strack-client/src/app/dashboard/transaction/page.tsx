'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import { ArrowDownLeft, ArrowUpRight, Download, Filter, Search } from 'lucide-react';
import { useState } from 'react';

type TransactionStatus = 'successful' | 'pending' | 'failed';
type TransactionType = 'credit' | 'debit';

interface Transaction {
  id: string;
  reference: string;
  description: string;
  amount: string;
  status: TransactionStatus;
  date: string;
  type: TransactionType;
}

const demoTransactions: Transaction[] = [];

const statusStyles: Record<TransactionStatus, string> = {
  successful: 'bg-[#E7F6EC] text-[#036B26]',
  pending: 'bg-[#FFF4E5] text-[#AD6F10]',
  failed: 'bg-[#FBEAE9] text-[#9E0A05]',
};

const tabs = ['All', 'Credit', 'Debit'] as const;

export default function TransactionPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = demoTransactions.filter((txn) => {
    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Credit' && txn.type === 'credit') ||
      (activeTab === 'Debit' && txn.type === 'debit');
    const matchesSearch =
      txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.reference.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <main>
      <HeaderSearch
        headerText="Transactions"
        headerDescription="View and manage all your transactions"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Total Transactions', value: '0', icon: ArrowUpRight },
          { label: 'Total Credit', value: '₦0.00', icon: ArrowDownLeft },
          { label: 'Total Debit', value: '₦0.00', icon: ArrowUpRight },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="border border-[#E1E4EA] rounded-xl p-5 bg-white flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#F7F9FC] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#525866]" />
              </div>
              <div>
                <p className="text-sm text-[#525866]">{stat.label}</p>
                <p className="text-xl font-semibold text-[#0E121B]">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-8 border border-[#E1E4EA] rounded-xl bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4 border-b border-[#E1E4EA]">
          <div className="flex gap-1 bg-[#F7F9FC] rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-[#0E121B] shadow-sm'
                    : 'text-[#525866] hover:text-[#0E121B]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A0AE]" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-[#E1E4EA] rounded-lg text-sm w-full sm:w-[250px] focus:outline-none focus:border-[#020C14]"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-[#E1E4EA] rounded-lg text-sm text-[#525866] hover:bg-[#F7F9FC]">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-[#E1E4EA] rounded-lg text-sm text-[#525866] hover:bg-[#F7F9FC]">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E1E4EA]">
                {['Reference', 'Description', 'Type', 'Amount', 'Status', 'Date'].map((h) => (
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
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-[#E1E4EA] last:border-b-0 hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 text-sm text-[#0E121B] font-medium">{txn.reference}</td>
                    <td className="px-5 py-4 text-sm text-[#525866]">{txn.description}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {txn.type === 'credit' ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-[#036B26]" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#9E0A05]" />
                        )}
                        <span className="text-sm text-[#525866] capitalize">{txn.type}</span>
                      </div>
                    </td>
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
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <ArrowUpRight className="w-10 h-10 text-[#E1E4EA] mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#0E121B]">No transactions yet</p>
                    <p className="text-xs text-[#99A0AE] mt-1">
                      Transactions will appear here once you start making payments
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
