import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { isServerDown } from './serverDown';

const err = (status?: number) =>
  new AxiosError('x', undefined, undefined, undefined, status ? ({ status } as never) : undefined);

describe('isServerDown', () => {
  it('is true with no response or a gateway error', () => {
    expect(isServerDown(err())).toBe(true);
    expect(isServerDown(err(502))).toBe(true);
    expect(isServerDown(err(503))).toBe(true);
  });
  it('is false for real answers and non-axios errors', () => {
    expect(isServerDown(err(401))).toBe(false);
    expect(isServerDown(err(500))).toBe(false);
    expect(isServerDown(new Error('x'))).toBe(false);
  });
});
