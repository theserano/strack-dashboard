import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/utils/axios', () => ({ default: {} }));
import reducer, { initialAuthState, setMode } from './slice';
import { clearUser } from '../user/slice';

describe('auth mode', () => {
  it('clearUser (logout or session expiry) resets demo to live', () => {
    const demo = reducer(initialAuthState, setMode('demo'));
    expect(demo.mode).toBe('demo');
    expect(reducer(demo, clearUser()).mode).toBe('live');
  });
});
