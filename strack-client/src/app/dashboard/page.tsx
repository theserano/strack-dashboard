"use client";
import { tokenManager } from '@/lib/utils/auth';
import api from '@/lib/utils/axios';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
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
      .catch(() => router.push('/login'));
  }, []);

  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="w-6 h-6 border-2 border-[#020C14] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
