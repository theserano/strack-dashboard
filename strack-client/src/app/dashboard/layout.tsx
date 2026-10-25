'use client';
import Sidebar from '@/lib/components/SideBar';
import DemoBanner from '@/lib/components/DemoBanner';
import { useDashboardGuard } from '@/lib/hooks/useDashboardGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { checking } = useDashboardGuard();

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
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
