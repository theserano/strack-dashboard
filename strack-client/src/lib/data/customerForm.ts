import type { Customer, ListParams, ListResult } from './types';
import type { CsvColumn } from '@/lib/utils/exportCsv';

export interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export const emptyCustomerForm: CustomerForm = { name: '', email: '', phone: '', notes: '' };

/** Field errors (empty object when valid). Limits match the server validation. */
export const validateCustomerForm = (f: CustomerForm): Partial<Record<keyof CustomerForm, string>> => {
  const e: Partial<Record<keyof CustomerForm, string>> = {};
  if (!f.name.trim()) e.name = 'Name is required';
  else if (f.name.trim().length > 100) e.name = 'Name must be at most 100 characters';
  if (!f.email.trim()) e.email = 'Email is required';
  else if (f.email.trim().length > 254) e.email = 'Email must be at most 254 characters';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (f.phone.trim().length > 30) e.phone = 'Phone must be at most 30 characters';
  if (f.notes.trim().length > 1000) e.notes = 'Notes must be at most 1000 characters';
  return e;
};

export const customerCsvColumns: CsvColumn<Customer>[] = [
  { header: 'Name', value: (c) => c.name },
  { header: 'Email', value: (c) => c.email },
  { header: 'Phone', value: (c) => c.phone },
  { header: 'Notes', value: (c) => c.notes },
  { header: 'Created', value: (c) => c.createdAt },
];

/** Reads every page of a list (used for the CSV export of the current filter). */
export async function fetchAllPages<T>(
  list: (p: ListParams) => Promise<ListResult<T>>,
  params: ListParams,
  pageSize = 500
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const r = await list({ ...params, page, limit: pageSize });
    out.push(...r.items);
    if (!r.items.length || out.length >= r.total) return out;
  }
}
