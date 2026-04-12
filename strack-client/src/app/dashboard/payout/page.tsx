'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import { BanknoteArrowDown, Building2, Download, Plus, Search } from 'lucide-react';
import { useState } from 'react';

type PayoutStatus = 'successful' | 'pending' | 'failed';

interface Payout {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: string;
  status: PayoutStatus;
  date: string;
}

const payouts: Payout[] = [];

const statusStyles: Record<PayoutStatus, string> = {
  successful: 'bg-[#E7F6EC] text-[#036B26]',
  pending: 'bg-[#FFF4E5] text-[#AD6F10]',
  failed: 'bg-[#FBEAE9] text-[#9E0A05]',
};

export default function PayoutPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main>
      <HeaderSearch
        headerText="Payouts"
        headerDescription="Manage your withdrawals and bank accounts"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Available Balance', value: '₦0.00' },
          { label: 'Total Payouts', value: '₦0.00' },
          { label: 'Pending Payouts', value: '₦0.00' },
        ].map((stat) => (
          <div key={stat.label} className="border border-[#E1E4EA] rounded-xl p-5 bg-white">
            <p className="text-sm text-[#525866]">{stat.label}</p>
            <p className="text-2xl font-semibold text-[#0E121B] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <section className="lg:col-span-2 border border-[#E1E4EA] rounded-xl bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4 border-b border-[#E1E4EA]">
            <div>
              <h3 className="text-base font-semibold text-[#0E121B]">Payout History</h3>
              <p className="text-sm text-[#525866]">Your withdrawal history</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A0AE]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-[#E1E4EA] rounded-lg text-sm w-[200px] focus:outline-none focus:border-[#020C14]"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-[#E1E4EA] rounded-lg text-sm text-[#525866] hover:bg-[#F7F9FC]">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E1E4EA]">
                    {['Bank', 'Account', 'Amount', 'Status', 'Date'].map((h) => (
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
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="border-b border-[#E1E4EA] last:border-b-0 hover:bg-[#F7F9FC]"
                    >
                      <td className="px-5 py-4 text-sm text-[#0E121B] font-medium">
                        {payout.bankName}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-[#0E121B]">{payout.accountName}</p>
                        <p className="text-xs text-[#99A0AE]">{payout.accountNumber}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#0E121B] font-medium">
                        {payout.amount}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[payout.status]}`}
                        >
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#525866]">{payout.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <BanknoteArrowDown className="w-10 h-10 text-[#E1E4EA] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#0E121B]">No payouts yet</p>
              <p className="text-xs text-[#99A0AE] mt-1">
                Withdraw funds to your bank account when you have available balance
              </p>
            </div>
          )}
        </section>

        <section className="border border-[#E1E4EA] rounded-xl bg-white h-fit">
          <div className="flex items-center justify-between p-5 border-b border-[#E1E4EA]">
            <h3 className="text-base font-semibold text-[#0E121B]">Bank Accounts</h3>
            <button className="p-2 rounded-lg hover:bg-[#F7F9FC] text-[#525866]">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <div className="p-8 text-center">
              <Building2 className="w-8 h-8 text-[#E1E4EA] mx-auto mb-2" />
              <p className="text-sm text-[#525866]">No bank accounts added</p>
              <p className="text-xs text-[#99A0AE] mt-1">Add a bank account to withdraw funds</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
