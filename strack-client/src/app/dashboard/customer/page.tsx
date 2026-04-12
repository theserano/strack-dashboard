'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import { Mail, MoreHorizontal, Phone, Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: string;
  transactions: number;
  lastTransaction: string;
}

const customers: Customer[] = [];

export default function CustomerPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main>
      <HeaderSearch
        headerText="Customers"
        headerDescription="Manage your customer base"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Total Customers', value: '0' },
          { label: 'Active Customers', value: '0' },
          { label: 'Total Revenue', value: '₦0.00' },
        ].map((stat) => (
          <div key={stat.label} className="border border-[#E1E4EA] rounded-xl p-5 bg-white">
            <p className="text-sm text-[#525866]">{stat.label}</p>
            <p className="text-2xl font-semibold text-[#0E121B] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 border border-[#E1E4EA] rounded-xl bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4 border-b border-[#E1E4EA]">
          <div>
            <h3 className="text-base font-semibold text-[#0E121B]">All Customers</h3>
            <p className="text-sm text-[#525866]">{customers.length} customers</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A0AE]" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-[#E1E4EA] rounded-lg text-sm w-full sm:w-[250px] focus:outline-none focus:border-[#020C14]"
              />
            </div>
            <CustomButton
              text="Add Customer"
              icon={<Plus className="w-4 h-4" />}
              className="!w-auto px-4"
            />
          </div>
        </div>

        {customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E1E4EA]">
                  {['Customer', 'Contact', 'Total Spent', 'Transactions', 'Last Transaction', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-medium text-[#525866] px-5 py-3 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-[#E1E4EA] last:border-b-0 hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#020C14] flex items-center justify-center text-white text-xs font-medium">
                          {customer.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-[#0E121B]">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-[#525866] flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {customer.email}
                        </span>
                        <span className="text-xs text-[#99A0AE] flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-[#0E121B]">
                      {customer.totalSpent}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#525866]">{customer.transactions}</td>
                    <td className="px-5 py-4 text-sm text-[#525866]">{customer.lastTransaction}</td>
                    <td className="px-5 py-4">
                      <button className="p-1 rounded hover:bg-[#F7F9FC]">
                        <MoreHorizontal className="w-4 h-4 text-[#525866]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <Users className="w-10 h-10 text-[#E1E4EA] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#0E121B]">No customers yet</p>
            <p className="text-xs text-[#99A0AE] mt-1">
              Customers will appear here when they make transactions through your payment links
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
