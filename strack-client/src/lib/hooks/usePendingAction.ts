import { useCallback, useEffect, useState } from 'react';

/**
 * Reads a one-shot action from the URL (?new=1, ?simulate=1) set by the Overview's Quick Actions.
 * Returns the action name and a clear() that removes it from the URL so a refresh doesn't reopen the modal.
 */
export function usePendingAction(names: string[] = ['new']) {
  const [action, setAction] = useState<string | null>(null);
  const key = names.join(',');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAction(key.split(',').find((n) => params.get(n)) ?? null);
  }, [key]);
  const clear = useCallback(() => {
    setAction(null);
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState(null, '', url.toString());
  }, []);
  return [action, clear] as const;
}
