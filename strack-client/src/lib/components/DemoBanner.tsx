'use client';
import { useState } from 'react';
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

export default function DemoBanner() {
  const mode = useAppSelector((s) => s.auth.mode);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { openReset, dialog } = useResetDemo();

  if (mode !== 'demo') return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900" role="status">
      <span>You&apos;re in demo mode. Changes are saved in this browser only.</span>
      <span className="flex gap-3">
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
      </span>
      {dialog}
    </div>
  );
}
