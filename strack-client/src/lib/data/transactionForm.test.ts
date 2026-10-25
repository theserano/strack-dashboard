import { describe, expect, it } from 'vitest';
import { presetRange, refundBlockReason, statusLockReason, toCsvAmount } from './transactionForm';
import type { Transaction } from './types';

const t = (o: Partial<Transaction> = {}): Transaction => ({
  id: 'a', type: 'credit', amount: 1000, status: 'successful', reference: 'R', date: '2026-10-25T10:00:00Z', ...o,
});

describe('presetRange', () => {
  const now = new Date(2026, 9, 25, 15, 0);
  it('today is one local day', () => expect(presetRange('today', now)).toEqual({ from: '2026-10-25', to: '2026-10-25' }));
  it('7d covers 7 days including today', () => expect(presetRange('7d', now)).toEqual({ from: '2026-10-19', to: '2026-10-25' }));
  it('30d crosses month ends', () => expect(presetRange('30d', now)).toEqual({ from: '2026-09-26', to: '2026-10-25' }));
  it('all and custom have no range', () => {
    expect(presetRange('all', now)).toEqual({});
    expect(presetRange('custom', now)).toEqual({});
  });
});

describe('refund and status reasons', () => {
  it('allows a successful credit', () => expect(refundBlockReason(t(), false)).toBeNull());
  it('blocks pending, debit, refund rows and double refunds', () => {
    expect(refundBlockReason(t({ status: 'pending' }), false)).toMatch(/Only successful/);
    expect(refundBlockReason(t({ type: 'debit' }), false)).toMatch(/Only successful/);
    expect(refundBlockReason(t({ refundOf: 'x' }), false)).toMatch(/Only successful/);
    expect(refundBlockReason(t(), true)).toMatch(/already been refunded/);
  });
  it('locks status for payout/refund rows and refunded credits', () => {
    expect(statusLockReason(t(), false)).toBeNull();
    expect(statusLockReason(t({ payoutId: 'p' }), false)).toMatch(/cannot be changed/);
    expect(statusLockReason(t({ refundOf: 'x' }), false)).toMatch(/cannot be changed/);
    expect(statusLockReason(t(), true)).toMatch(/must stay successful/);
  });
});

describe('csv amount', () => {
  it('debits are negative naira', () => {
    expect(toCsvAmount(t({ type: 'debit', amount: 12345 }))).toBe(-123.45);
    expect(toCsvAmount(t())).toBe(10);
  });
});
