import { describe, expect, it } from 'vitest';
import { fetchAllPages, validateCustomerForm } from './customerForm';

describe('validateCustomerForm', () => {
  const ok = { name: 'A', email: 'a@b.co', phone: '', notes: '' };
  it('accepts a valid form', () => expect(validateCustomerForm(ok)).toEqual({}));
  it('flags name, email and length limits', () => {
    expect(validateCustomerForm({ ...ok, name: ' ' }).name).toBeTruthy();
    expect(validateCustomerForm({ ...ok, email: 'bad' }).email).toBeTruthy();
    expect(validateCustomerForm({ ...ok, notes: 'x'.repeat(1001) }).notes).toBeTruthy();
  });
});

describe('fetchAllPages', () => {
  it('reads every page', async () => {
    const data = Array.from({ length: 7 }, (_, i) => i);
    const calls: number[] = [];
    const out = await fetchAllPages(
      async (p) => {
        calls.push(p.page!);
        return { items: data.slice((p.page! - 1) * p.limit!, p.page! * p.limit!), total: 7, page: p.page!, limit: p.limit! };
      },
      {},
      3
    );
    expect(out).toEqual(data);
    expect(calls).toEqual([1, 2, 3]);
  });
});
