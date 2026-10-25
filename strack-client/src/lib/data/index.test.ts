import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/utils/axios', () => ({ default: {} }));

import { getDataSource } from './index';
import { apiSource } from './apiSource';
import { localSource } from './localSource';

describe('getDataSource', () => {
  it('returns the api source in live mode', () => {
    expect(getDataSource('live')).toBe(apiSource);
  });
  it('returns the local source in demo mode', () => {
    expect(getDataSource('demo')).toBe(localSource);
  });
  it('local stub throws until Phase 1', () => {
    expect(() => getDataSource('demo').customers.list()).toThrow('Demo mode arrives in Phase 1');
  });
});
