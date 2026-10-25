import type { CsvColumn } from '@/lib/utils/exportCsv';
import type { Transaction } from './types';

export type DatePreset = 'all' | 'today' | '7d' | '30d' | 'custom';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Inclusive local-day range for a preset (custom and all have no preset range). */
export const presetRange = (preset: DatePreset, now = new Date()): { from?: string; to?: string } => {
  if (preset === 'today') return { from: ymd(now), to: ymd(now) };
  if (preset === '7d' || preset === '30d') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (preset === '7d' ? 6 : 29));
    return { from: ymd(start), to: ymd(now) };
  }
  return {};
};

/** Why a transaction cannot be refunded, or null when it can. `refunded` = it already has a refund. */
export const refundBlockReason = (t: Transaction, refunded: boolean): string | null => {
  if (t.type !== 'credit' || t.status !== 'successful' || t.refundOf || t.payoutId) {
    return 'Only successful payments can be refunded.';
  }
  return refunded ? 'This transaction has already been refunded.' : null;
};

/** Why the status cannot be changed, or null when it can. */
export const statusLockReason = (t: Transaction, refunded: boolean): string | null => {
  if (t.payoutId || t.refundOf) return 'Payout and refund transactions cannot be changed.';
  return refunded ? 'This transaction has been refunded and must stay successful.' : null;
};

export const MAX_NOTE = 500;

export const toCsvAmount = (t: Transaction) => (t.type === 'debit' ? -t.amount : t.amount) / 100;

export const transactionCsvColumns = (customerName: (id?: string) => string): CsvColumn<Transaction>[] => [
  { header: 'Date', value: (t) => t.date },
  { header: 'Reference', value: (t) => t.reference },
  { header: 'Customer', value: (t) => customerName(t.customerId) },
  { header: 'Type', value: (t) => t.type },
  { header: 'Amount (NGN)', value: toCsvAmount },
  { header: 'Status', value: (t) => t.status },
  { header: 'Channel', value: (t) => t.channel },
  { header: 'Description', value: (t) => t.description },
  { header: 'Note', value: (t) => t.note },
];
