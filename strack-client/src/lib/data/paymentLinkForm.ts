import { toKobo } from '@/lib/utils/money';

export interface PaymentLinkForm {
  title: string;
  /** Naira text; empty means an open-amount link. */
  amount: string;
  description: string;
}

export const emptyPaymentLinkForm: PaymentLinkForm = { title: '', amount: '', description: '' };

/** Limit matches the server (NGN 1 billion, in kobo). */
export const MAX_AMOUNT_KOBO = 100_000_000_000;

/** Naira text to kobo; undefined for empty text, null when invalid (zero, negative, too large, malformed). */
export const parseNaira = (text: string): number | undefined | null => {
  if (!text.trim()) return undefined;
  try {
    const k = toKobo(text);
    return k >= 1 && k <= MAX_AMOUNT_KOBO ? k : null;
  } catch {
    return null;
  }
};

/** Field errors (empty object when valid). Limits match the server validation. */
export const validatePaymentLinkForm = (f: PaymentLinkForm): Partial<Record<keyof PaymentLinkForm, string>> => {
  const e: Partial<Record<keyof PaymentLinkForm, string>> = {};
  if (!f.title.trim()) e.title = 'Title is required';
  else if (f.title.trim().length > 100) e.title = 'Title must be at most 100 characters';
  if (parseNaira(f.amount) === null) e.amount = 'Enter a valid amount (up to ₦1,000,000,000)';
  if (f.description.trim().length > 500) e.description = 'Description must be at most 500 characters';
  return e;
};
