import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, setNetworkBlocked } = vi.hoisted(() => ({ post: vi.fn(), setNetworkBlocked: vi.fn() }));
vi.mock('@/lib/utils/axios', () => ({ default: { post }, setNetworkBlocked, SESSION_EXPIRED_EVENT: 'x' }));

import { makeStore } from '@/lib/store';
import { setMode } from './slice';
import { setUser } from '../user/slice';
import { loginUser, signUpUser } from './thunkActions';
import { enterDemo } from '@/lib/data/demoSession';
import { tokenManager } from '@/lib/utils/auth';

const live = { user: { _id: 'u1' }, accessToken: 'tok' };
beforeEach(() => {
  post.mockReset();
  setNetworkBlocked.mockReset();
  post.mockResolvedValue({ data: { data: live } });
});

describe('leaving demo to authenticate', () => {
  it.each([
    ['login', () => loginUser({ values: { email: 'a@b.co', password: 'p' } })],
    ['signup', () => signUpUser({ values: {} as never })],
  ])('%s from demo unblocks the network and reaches the API', async (_n, thunk) => {
    const store = makeStore();
    store.dispatch(setMode('demo'));
    store.dispatch(setUser({ _id: 'demo_user' } as never));
    await store.dispatch(thunk() as never);
    expect(setNetworkBlocked).toHaveBeenCalledWith(false);
    expect(post).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.mode).toBe('live');
    expect(store.getState().user.user).toEqual({ _id: 'u1' });
  });
  it('a live login does not touch the network guard', async () => {
    const store = makeStore();
    await store.dispatch(loginUser({ values: { email: 'a@b.co', password: 'p' } }) as never);
    expect(setNetworkBlocked).not.toHaveBeenCalled();
  });
});

describe('enterDemo', () => {
  it('drops the live token and user', async () => {
    const store = makeStore();
    tokenManager.set('live-token');
    store.dispatch(setUser({ _id: 'real' } as never));
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) });
    await enterDemo(store.dispatch);
    expect(tokenManager.get()).toBeNull();
    expect(store.getState().user.user?._id).toBe('demo_user');
    expect(store.getState().auth.mode).toBe('demo');
  });
});
