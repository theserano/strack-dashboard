import { describe, expect, it } from 'vitest';
import { formatMoney, fromKobo, toKobo } from './money';

describe('toKobo', () => {
  it('has no float drift', () => {
    expect(toKobo('0.29')).toBe(29);
    expect(toKobo(0.29)).toBe(29);
    expect(toKobo('1.1')).toBe(110);
    expect(toKobo(19.99)).toBe(1999);
  });
  it('rounds half up past two decimals', () => {
    expect(toKobo('1.005')).toBe(101);
    expect(toKobo('1.004')).toBe(100);
  });
  it('handles negatives and zero', () => {
    expect(toKobo('-12.50')).toBe(-1250);
    expect(toKobo('-0')).toBe(0);
    expect(Object.is(toKobo('-0.00'), 0)).toBe(true);
    expect(toKobo('0')).toBe(0);
  });
  it('strips separators and symbol, handles large values', () => {
    expect(toKobo('₦1,234.50')).toBe(123450);
    expect(toKobo('9999999999.99')).toBe(999999999999);
  });
  it('rejects amounts beyond the safe integer range', () => {
    expect(() => toKobo('99999999999999999')).toThrow();
  });
  it('rejects exponent-form numbers and misplaced commas', () => {
    expect(() => toKobo(1e21)).toThrow();
    expect(() => toKobo(1e-7)).toThrow();
    expect(() => toKobo('1,2,3')).toThrow();
    expect(() => toKobo('12,34')).toThrow();
    expect(toKobo('1,234')).toBe(123400);
  });
  it('rejects garbage', () => {
    expect(() => toKobo('abc')).toThrow();
    expect(() => toKobo('')).toThrow();
  });
});

describe('formatMoney / fromKobo', () => {
  it('formats NGN', () => {
    expect(formatMoney(123450)).toBe('₦1,234.50');
    expect(formatMoney(0)).toBe('₦0.00');
    expect(formatMoney(5)).toBe('₦0.05');
    expect(formatMoney(100000000000)).toBe('₦1,000,000,000.00');
  });
  it('formats negatives', () => {
    expect(formatMoney(-123450)).toMatch(/^-₦1,234\.50$/);
  });
  it('fromKobo divides by 100', () => {
    expect(fromKobo(123450)).toBe(1234.5);
    expect(fromKobo(57)).toBe(0.57);
  });
});
