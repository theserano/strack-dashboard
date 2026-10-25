import { describe, expect, it } from 'vitest';
import { parseNaira, validatePaymentLinkForm } from './paymentLinkForm';

describe('parseNaira', () => {
  it('converts to kobo, empty is open amount, bad input is null', () => {
    expect(parseNaira('1,234.50')).toBe(123450);
    expect(parseNaira(' ')).toBeUndefined();
    expect(parseNaira('0')).toBeNull();
    expect(parseNaira('-5')).toBeNull();
    expect(parseNaira('abc')).toBeNull();
    expect(parseNaira('1000000001')).toBeNull();
  });
});

describe('validatePaymentLinkForm', () => {
  const ok = { title: 'Fee', amount: '', description: '' };
  it('accepts valid and flags title, amount, description', () => {
    expect(validatePaymentLinkForm(ok)).toEqual({});
    expect(validatePaymentLinkForm({ ...ok, title: ' ' }).title).toBeTruthy();
    expect(validatePaymentLinkForm({ ...ok, amount: '0' }).amount).toBeTruthy();
    expect(validatePaymentLinkForm({ ...ok, description: 'x'.repeat(501) }).description).toBeTruthy();
  });
});
