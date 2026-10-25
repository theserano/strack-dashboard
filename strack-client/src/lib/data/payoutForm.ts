import type { CsvColumn } from '@/lib/utils/exportCsv';
import { NIGERIAN_BANKS } from './banks';
import { PAYOUT_FEE } from './seed';
import type { BankAccount, Payout } from './types';

// Keep in sync with strack-server/src/modules/payout/payout.constants.ts (integer kobo).
export { PAYOUT_FEE };
export const MIN_PAYOUT = 10000; // NGN 100
export const MAX_PAYOUT = 1_000_000_000; // NGN 10,000,000

/** Error for the payout amount (kobo), or null. Messages match the server. */
export const payoutAmountError = (amount: unknown): string | null => {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) return 'Enter a valid amount';
  if (amount < MIN_PAYOUT) return 'Minimum payout is ₦100';
  if (amount > MAX_PAYOUT) return 'Maximum payout is ₦10,000,000';
  return null;
};

/** Why a payout cannot be requested right now, or null. */
export const payoutBlockReason = (balance: number | null | undefined, hasAccount: boolean): string | null => {
  if (!hasAccount) return 'Add a bank account first.';
  if (balance === null || balance === undefined) return 'Loading your balance...';
  if (balance < MIN_PAYOUT + PAYOUT_FEE) return 'Your balance is too low to request a payout.';
  return null;
};

export interface BankAccountForm {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export const emptyBankAccountForm: BankAccountForm = { bankName: '', accountNumber: '', accountName: '', isDefault: false };

export const bankFieldErrors = (f: Partial<BankAccountForm>, partial = false): Partial<Record<'bankName' | 'accountNumber' | 'accountName', string>> => {
  const e: Partial<Record<'bankName' | 'accountNumber' | 'accountName', string>> = {};
  if (!partial || f.bankName !== undefined) {
    if (!(NIGERIAN_BANKS as readonly string[]).includes(f.bankName ?? '')) e.bankName = 'Select a supported bank';
  }
  if (!partial || f.accountNumber !== undefined) {
    if (!/^\d{10}$/.test(f.accountNumber ?? '')) e.accountNumber = 'Account number must be exactly 10 digits';
  }
  if (!partial || f.accountName !== undefined) {
    const n = (f.accountName ?? '').trim();
    if (!n) e.accountName = 'Account name is required';
    else if (n.length > 100) e.accountName = 'Account name must be at most 100 characters';
  }
  return e;
};

export const validateBankAccountForm = (f: BankAccountForm) => bankFieldErrors(f);

export const payoutCsvColumns = (bankLabel: (id: string) => string): CsvColumn<Payout>[] => [
  { header: 'Date', value: (p) => p.createdAt },
  { header: 'Reference', value: (p) => p.reference },
  { header: 'Bank account', value: (p) => (p.bankName && p.accountNumber ? `${p.bankName} ${p.accountNumber}` : bankLabel(p.bankAccountId)) },
  { header: 'Amount (NGN)', value: (p) => p.amount / 100 },
  { header: 'Fee (NGN)', value: (p) => p.fee / 100 },
  { header: 'Status', value: (p) => p.status },
];

export const bankLabel = (b?: Pick<BankAccount, 'bankName' | 'accountNumber'>) => (b ? `${b.bankName} ${b.accountNumber}` : 'Deleted account');

/** Parses a naira text input ("1,500.50") to kobo. Null when it is not a plain amount with at most 2 decimals. */
export const parseNairaInput = (text: string): number | null => {
  const t = text.replace(/[₦\s,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [whole, frac = ''] = t.split('.');
  const kobo = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return Number.isSafeInteger(kobo) ? kobo : null;
};
