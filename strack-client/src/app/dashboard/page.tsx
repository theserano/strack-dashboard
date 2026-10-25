"use client";
import { tokenManager } from '@/lib/utils/auth';
import api from '@/lib/utils/axios';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hook';
import { clearUser } from '@/lib/features/user/slice';
import { useEffect } from 'react';

export default function DashboardRootPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const mode = useAppSelector((s) => s.auth.mode);
  const hydrated = useAppSelector((s) => s.auth.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (mode === 'demo') {
      router.replace('/dashboard/user'); // no network call in demo mode
      return;
    }
    api
      .post('/auth/refresh')
      .then((res) => tokenManager.set(res.data.data.accessToken))
      .then(() => {
        if (!tokenManager.get()) {
          router.push('/login');
        } else {
          router.push('/dashboard/user');
        }
      })
      .catch(() => {
        dispatch(clearUser()); // drop the stale saved user too
        router.push('/login');
      });
  }, [hydrated, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="w-6 h-6 border-2 border-[#020C14] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
