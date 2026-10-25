// Helpers for DD/MM/YYYY date strings.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Turns whatever the user typed into DD/MM/YYYY, adding slashes as they go. */
export const maskDate = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
};

/** Returns a Date for a complete, real DD/MM/YYYY string, otherwise null. */
export const parseDate = (value: string): Date | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects dates like 31/02/2000, which JS would roll over to March.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

export const formatDate = (date: Date): string =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

/** DD/MM/YYYY -> YYYY-MM-DD for the API, or null if invalid. */
export const toISODate = (value: string): string | null => {
  const date = parseDate(value);
  return date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : null;
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const isOutOfRange = (date: Date, minDate?: Date, maxDate?: Date) =>
  (!!minDate && date < startOfDay(minDate)) || (!!maxDate && date > startOfDay(maxDate));

/** Returns the date `years` years before today, e.g. the latest DOB for an 18+ user. */
export const yearsAgo = (years: number) => {
  const today = startOfDay(new Date());
  return new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
};

/** ISO date or datetime from the API (e.g. 1990-03-12T00:00:00.000Z) -> DD/MM/YYYY. */
export const fromISODate = (iso?: string | null): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};
