'use client";';
import { tokenManager } from '@/lib/utils/auth';
import api from '@/lib/utils/axios';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRootPage() {
  useEffect(() => {
    api
      .post('/auth/refresh')
      .then((res) => tokenManager.set(res.data.data.accessToken))
      .catch(() => (window.location.href = '/login'));
  }, []);

  redirect('/dashboard/compliance');
}
