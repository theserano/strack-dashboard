import type { AppDispatch } from '@/lib/store';
import { setMode } from '@/lib/features/auth/slice';
import { clearUser, setUser } from '@/lib/features/user/slice';
import { tokenManager } from '@/lib/utils/auth';
import { localSource } from './localSource';

/** Starts a demo session: loads the demo user (seeding on first use) and switches mode. */
export async function enterDemo(dispatch: AppDispatch) {
  // A live session must not survive into demo.
  tokenManager.clear();
  dispatch(clearUser());
  const user = await localSource.user.get();
  dispatch(setUser(user));
  dispatch(setMode('demo'));
}

/** Wipes demo data, re-seeds, and refreshes the user kept in the store. */
export async function resetDemo(dispatch: AppDispatch) {
  await localSource.reset();
  dispatch(setUser(await localSource.user.get()));
}

/** Leaves demo mode (clearUser also switches the mode back to live). */
export function exitDemo(dispatch: AppDispatch) {
  dispatch(clearUser());
}
