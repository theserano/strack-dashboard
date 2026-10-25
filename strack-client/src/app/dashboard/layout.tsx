'use client';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '@/lib/components/SideBar';
import DemoBanner from '@/lib/components/DemoBanner';
import { useDashboardGuard } from '@/lib/hooks/useDashboardGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { checking } = useDashboardGuard();
  const [navOpen, setNavOpen] = useState(false);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" role="status" aria-live="polite">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b px-4 py-3 sm:hidden">
            <button type="button" aria-label="Open menu" onClick={() => setNavOpen(true)} className="rounded p-1 hover:bg-accent">
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-base font-semibold">Strack</span>
          </div>
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
