import type { ActivityEvent } from './types';

/** Entities that appear in the log, with the label shown in the filter. */
export const ACTIVITY_ENTITIES: { value: string; label: string }[] = [
  { value: 'customer', label: 'Customers' },
  { value: 'payment link', label: 'Payment links' },
  { value: 'transaction', label: 'Transactions' },
  { value: 'bank account', label: 'Bank accounts' },
  { value: 'payout', label: 'Payouts' },
  { value: 'user', label: 'Profile & compliance' },
  { value: 'support_ticket', label: 'Support' },
  { value: 'settings', label: 'Settings' },
];

const PAGES: Record<string, string> = {
  customer: '/dashboard/customer',
  'payment link': '/dashboard/payment',
  transaction: '/dashboard/transaction',
  'bank account': '/dashboard/payout',
  payout: '/dashboard/payout',
  user: '/dashboard/compliance',
  support_ticket: '/dashboard/support',
  settings: '/dashboard/settings',
};

/** Where clicking an event goes; only transactions can open a specific record (and not after a delete). */
export const eventHref = (e: Pick<ActivityEvent, 'entity' | 'entityId' | 'action'>): string | null => {
  const base = PAGES[e.entity];
  if (!base) return null;
  return e.entity === 'transaction' && e.action !== 'delete' ? `${base}?id=${encodeURIComponent(e.entityId)}` : base;
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Heading for a local calendar day: Today, Yesterday, or the date. */
export const dayLabel = (iso: string, now = new Date()): string => {
  const d = new Date(iso);
  if (ymd(d) === ymd(now)) return 'Today';
  if (ymd(d) === ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

/** Groups events (already newest first) into consecutive local-day sections. */
export const groupByDay = <T extends { date: string }>(items: T[], now = new Date()): { label: string; items: T[] }[] => {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const it of items) {
    const key = ymd(new Date(it.date));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(it);
    else groups.push({ key, label: dayLabel(it.date, now), items: [it] });
  }
  return groups.map(({ label, items }) => ({ label, items }));
};
