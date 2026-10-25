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

/** Kobo to naira as a number (display only). */
export function fromKobo(kobo: number): number {
  return kobo / 100;
}

/** "1,234.50" or 1234.5 -> 123450. Parses the decimal text so "0.29" gives 29, not 28.999. */
export function toKobo(naira: string | number): number {
  let text = typeof naira === 'number' ? naira.toFixed(10) : naira;
  text = text.replace(/[₦,\s]/g, '');
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[2] === '' && !match[3])) throw new Error(`Invalid amount: ${naira}`);
  const [, sign, whole, frac = ''] = match;
  const padded = (frac + '00').slice(0, 3);
  // Round half up on the third decimal digit.
  let kobo = Number(whole || '0') * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) kobo += 1;
  return sign && kobo !== 0 ? -kobo : kobo;
}
