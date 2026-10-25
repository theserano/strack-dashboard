'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hook';

/**
 * Redirects to /login when nobody is logged in (unless in demo mode).
 * Returns true while the saved session is still being read, so callers show a loader.
 * The access token itself is restored lazily by axios.ts from the refresh cookie.
 */
export function useDashboardGuard(): { checking: boolean } {
  const router = useRouter();
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const mode = useAppSelector((s) => s.auth.mode);
  const hasUser = useAppSelector((s) => !!s.user.user);
  const allowed = hasUser || mode === 'demo';

  useEffect(() => {
    if (hydrated && !allowed) router.replace('/login');
  }, [hydrated, allowed, router]);

  return { checking: !hydrated || !allowed };
}
