'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import { Copy, ExternalLink, Link2, Plus, QrCode } from 'lucide-react';

interface PaymentLink {
  id: string;
  name: string;
  amount: string;
  url: string;
  status: 'active' | 'inactive';
  createdAt: string;
  totalCollected: string;
  transactions: number;
}

const paymentLinks: PaymentLink[] = [];

export default function PaymentPage() {
  return (
    <main>
      <HeaderSearch
        headerText="Payments"
        headerDescription="Create and manage payment links"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Total Collected', value: '₦0.00' },
          { label: 'Active Links', value: '0' },
          { label: 'Total Transactions', value: '0' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-[#E1E4EA] rounded-xl p-5 bg-white"
          >
            <p className="text-sm text-[#525866]">{stat.label}</p>
            <p className="text-2xl font-semibold text-[#0E121B] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 border border-[#E1E4EA] rounded-xl bg-white">
        <div className="flex items-center justify-between p-5 border-b border-[#E1E4EA]">
          <div>
            <h3 className="text-base font-semibold text-[#0E121B]">Payment Links</h3>
            <p className="text-sm text-[#525866]">Create links to receive payments</p>
          </div>
          <CustomButton
            text="Create Link"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {}}
            className="!w-auto px-4"
          />
        </div>

        {paymentLinks.length > 0 ? (
          <div className="divide-y divide-[#E1E4EA]">
            {paymentLinks.map((link) => (
              <div
                key={link.id}
                className="p-5 flex items-center justify-between hover:bg-[#F7F9FC] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#F7F9FC] flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-[#525866]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0E121B]">{link.name}</p>
                    <p className="text-xs text-[#99A0AE]">{link.amount} per payment</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-[#0E121B]">{link.totalCollected}</p>
                    <p className="text-xs text-[#99A0AE]">{link.transactions} transactions</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      link.status === 'active'
                        ? 'bg-[#E7F6EC] text-[#036B26]'
                        : 'bg-[#F7F9FC] text-[#525866]'
                    }`}
                  >
                    {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg hover:bg-[#F7F9FC] text-[#525866]">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-[#F7F9FC] text-[#525866]">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center">
            <QrCode className="w-10 h-10 text-[#E1E4EA] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#0E121B]">No payment links yet</p>
            <p className="text-xs text-[#99A0AE] mt-1">
              Create a payment link to start receiving payments from your customers
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
