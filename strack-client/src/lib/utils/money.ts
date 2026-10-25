/** Money helpers. Amounts are integer kobo; never use float math on them. */

const formatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123450 -> "₦1,234.50". */
export function formatMoney(kobo: number): string {
  return formatter.format(fromKobo(kobo));
}

/** Like formatMoney, but "—" when there is no value (loading or failed) instead of a misleading ₦0.00. */
export function formatMoneyOrDash(kobo?: number | null): string {
  return kobo === undefined || kobo === null ? '—' : formatMoney(kobo);
}

/** Kobo to naira as a number (display only). */
export function fromKobo(kobo: number): number {
  return kobo / 100;
}

/** "1,234.50" or 1234.5 -> 123450. Parses the decimal text so "0.29" gives 29, not 28.999. */
export function toKobo(naira: string | number): number {
  // Tiny numbers print in exponent form but are 0 kobo.
  if (typeof naira === 'number' && Number.isFinite(naira) && Math.abs(naira) < 1e-6) return 0;
  let text = typeof naira === 'number' ? String(naira) : naira;
  if (/e/i.test(text)) throw new Error(`Invalid amount: ${naira}`); // exponent form loses precision
  text = text.replace(/[₦\s]/g, '');
  // Commas are only allowed as thousands separators: "1,234,567.89", not "1,2,3".
  if (text.includes(',')) {
    if (!/^-?[1-9]\d{0,2}(,\d{3})+(\.\d*)?$/.test(text)) throw new Error(`Invalid amount: ${naira}`);
    text = text.replace(/,/g, '');
  }
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[2] === '' && !match[3])) throw new Error(`Invalid amount: ${naira}`);
  const [, sign, whole, frac = ''] = match;
  const padded = (frac + '00').slice(0, 3);
  // Round half up on the third decimal digit.
  let kobo = Number(whole || '0') * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) kobo += 1;
  const result = sign && kobo !== 0 ? -kobo : kobo;
  if (!Number.isSafeInteger(result)) throw new Error(`Amount out of range: ${naira}`);
  return result;
}
