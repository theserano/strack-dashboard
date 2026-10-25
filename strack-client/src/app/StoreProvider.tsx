'use client';
import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '../lib/store';
import { setUser } from '../lib/features/user/slice';

const USER_KEY = 'strack:user';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  // Keep the logged-in user across page reloads. This runs after mount (not in makeStore)
  // so the server render and first client render match.
  useEffect(() => {
    const store = storeRef.current!;
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (saved && !store.getState().user.user) store.dispatch(setUser(JSON.parse(saved)));
    } catch {
      // Ignore unreadable or blocked storage.
    }

    let last = store.getState().user.user;
    return store.subscribe(() => {
      const current = store.getState().user.user;
      if (current === last) return;
      last = current;
      try {
        if (current) localStorage.setItem(USER_KEY, JSON.stringify(current));
        else localStorage.removeItem(USER_KEY);
      } catch {
        // Ignore unreadable or blocked storage.
      }
    });
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
