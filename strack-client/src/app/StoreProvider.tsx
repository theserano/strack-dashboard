'use client';
import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '../lib/store';
import { setUser } from '../lib/features/user/slice';
import { setHydrated, setMode } from '../lib/features/auth/slice';

const USER_KEY = 'strack:user';
const MODE_KEY = 'strack:mode';

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
    try {
      if (localStorage.getItem(MODE_KEY) === 'demo') store.dispatch(setMode('demo'));
    } catch {
      // Ignore unreadable or blocked storage.
    }
    // Route guards wait for this so they don't bounce a user before storage is read.
    store.dispatch(setHydrated());

    let last = store.getState().user.user;
    let lastMode = store.getState().auth.mode;
    return store.subscribe(() => {
      const mode = store.getState().auth.mode;
      if (mode !== lastMode) {
        lastMode = mode;
        try {
          localStorage.setItem(MODE_KEY, mode);
        } catch {
          // Ignore unreadable or blocked storage.
        }
      }
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
