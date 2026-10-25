'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hook';
import { exitDemo, resetDemo } from '@/lib/data/demoSession';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from '@/lib/utils/plainFunctions';

/** Resets demo data after a confirmation. Shared by the banner and Settings. */
export function useResetDemo() {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await resetDemo(dispatch);
      showToast({ message: 'Demo reset', description: 'Demo data was restored.' });
    } catch {
      showToast({ message: 'Error', description: 'Could not reset the demo data.' });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const dialog = (
    <ConfirmDialog
      open={open}
      title="Reset demo data?"
      message="This deletes your changes in this browser and restores the original sample data."
      confirmLabel="Reset demo data"
      destructive
      loading={loading}
      onConfirm={confirm}
      onCancel={() => setOpen(false)}
    />
  );
  return { openReset: () => setOpen(true), dialog };
}

/** Set when the viewer closes the banner; cleared when a new demo session starts. */
export const DEMO_BANNER_HIDDEN_KEY = 'strack:ui:demoBannerHidden';

export default function DemoBanner() {
  const mode = useAppSelector((s) => s.auth.mode);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { openReset, dialog } = useResetDemo();
  // Start hidden-unknown until mounted, so server and client render the same markup.
  const [hidden, setHidden] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DEMO_BANNER_HIDDEN_KEY) === '1');
    } catch {
      setHidden(false);
    }
  }, []);

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(DEMO_BANNER_HIDDEN_KEY, '1');
    } catch {
      // Storage blocked: hide for this page view only.
    }
  };

  if (mode !== 'demo' || hidden !== false) return dialog;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900" role="status">
      <span>You&apos;re in demo mode. Changes are saved in this browser only.</span>
      <span className="flex items-center gap-3">
        <button type="button" onClick={openReset} className="font-medium underline">
          Reset demo data
        </button>
        <button
          type="button"
          onClick={() => {
            exitDemo(dispatch);
            router.push('/login');
          }}
          className="font-medium underline"
        >
          Exit demo
        </button>
        <button
          type="button"
          onClick={hide}
          aria-label="Hide demo banner"
          title="Hide banner (Reset is also in Settings)"
          className="rounded p-1 hover:bg-amber-200"
        >
          <X size={16} />
        </button>
      </span>
      {dialog}
    </div>
  );
}
