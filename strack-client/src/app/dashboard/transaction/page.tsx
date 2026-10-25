'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import DataTable, { type Column } from '@/lib/components/DataTable';
import Drawer from '@/lib/components/Drawer';
import ConfirmDialog from '@/lib/components/ConfirmDialog';
import StatusBadge from '@/lib/components/StatusBadge';
import { useAppSelector } from '@/lib/hook';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { getDataSource } from '@/lib/data';
import { fetchAllPages } from '@/lib/data/customerForm';
import {
  MAX_NOTE,
  presetRange,
  refundBlockReason,
  statusLockReason,
  transactionCsvColumns,
  type DatePreset,
} from '@/lib/data/transactionForm';
import type { Customer, PaymentLink, Transaction, TransactionStatus } from '@/lib/data/types';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import { exportCsv } from '@/lib/utils/exportCsv';
import { formatMoney } from '@/lib/utils/money';
import { showToast } from '@/lib/utils/plainFunctions';

const LIMIT = 10;
const STATUSES: TransactionStatus[] = ['successful', 'pending', 'failed'];
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const field = 'rounded-md border border-[#E1E4EA] px-3 py-2 text-sm';

const Amount = ({ t }: { t: Transaction }) => (
  <span className={t.type === 'debit' ? 'font-medium text-red-600' : 'font-medium text-green-700'}>
    {t.type === 'debit' ? '-' : '+'}
    {formatMoney(t.amount)}
  </span>
);

export default function TransactionPage() {
  const mode = useAppSelector((s) => s.auth.mode);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [preset, setPreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Presets are evaluated when chosen so "today" does not go stale within the request key.
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  useEffect(() => {
    setRange(preset === 'custom' ? { from: customFrom || undefined, to: customTo || undefined } : presetRange(preset));
  }, [preset, customFrom, customTo]);
  const badRange = !!range.from && !!range.to && range.from > range.to;

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: search.trim() || undefined,
      status: status || undefined,
      type: type || undefined,
      ...(badRange ? {} : range),
    }),
    [page, search, status, type, range, badRange]
  );
  const { data, error, loading, refetch } = useTransactions(params);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Customer names for the table and the drawer (best effort: a failure just shows "-").
  const [customers, setCustomers] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    setCustomers({});
    fetchAllPages<Customer>(getDataSource(mode).customers.list, {})
      .then((rows) => !cancelled && setCustomers(Object.fromEntries(rows.map((c) => [c.id, c.name]))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mode]);
  const customerName = (id?: string) => (id ? customers[id] ?? '-' : '-');

  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { page: _p, limit: _l, ...filters } = params;
      void _p;
      void _l;
      const rows = await fetchAllPages(getDataSource(mode).transactions.list, filters);
      if (!rows.length) {
        showToast({ message: 'Nothing to export', description: 'There are no transactions to export.' });
        return;
      }
      exportCsv(rows, transactionCsvColumns(customerName), 'transactions.csv');
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not export transactions.') });
    } finally {
      setExporting(false);
    }
  };

  /* ---------------- detail drawer ---------------- */
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [refundTxn, setRefundTxn] = useState<Transaction | null | undefined>(undefined); // the refund of `selected`
  const [original, setOriginal] = useState<Transaction | null>(null);
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TransactionStatus | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);

  const selectedId = selected?.id;
  const refundOf = selected?.refundOf;
  const paymentLinkId = selected?.paymentLinkId;
  const isCredit = selected?.type === 'credit';
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const ds = getDataSource(mode);
    setRefundTxn(undefined);
    setOriginal(null);
    setLink(null);
    if (isCredit) {
      ds.transactions
        .list({ refundOf: selectedId, limit: 1 })
        .then((r) => !cancelled && setRefundTxn(r.items[0] ?? null))
        .catch(() => !cancelled && setRefundTxn(undefined));
    }
    if (refundOf) ds.transactions.get(refundOf).then((t) => !cancelled && setOriginal(t)).catch(() => undefined);
    if (paymentLinkId) ds.paymentLinks.get(paymentLinkId).then((l) => !cancelled && setLink(l)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedId, refundOf, paymentLinkId, isCredit, mode]);

  const open = (t: Transaction) => {
    setSelected(t);
    setNoteDraft(t.note ?? '');
    setPendingStatus(null);
    setConfirmRefund(false);
  };
  const close = () => {
    if (busy) return;
    setSelected(null);
    setPendingStatus(null);
    setConfirmRefund(false);
  };

  // The dataset changes with the mode: close anything that points at the old one.
  useEffect(() => {
    setSelected(null);
    setPendingStatus(null);
    setConfirmRefund(false);
    setPage(1);
  }, [mode]);

  const run = async (fn: () => Promise<void>, fallback: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, fallback) });
    } finally {
      setBusy(false);
    }
  };

  const saveNote = () =>
    selected &&
    run(async () => {
      const t = await getDataSource(mode).transactions.addNote(selected.id, noteDraft.trim());
      setSelected(t);
      setNoteDraft(t.note ?? '');
      showToast({ message: 'Saved', description: 'Note updated.' });
      refetch();
    }, 'Could not save the note.');

  const changeStatus = () =>
    selected &&
    pendingStatus &&
    run(async () => {
      try {
        const t = await getDataSource(mode).transactions.updateStatus(selected.id, pendingStatus);
        setSelected(t);
        showToast({ message: 'Saved', description: `Marked as ${t.status}.` });
        refetch();
      } finally {
        setPendingStatus(null);
      }
    }, 'Could not change the status.');

  const doRefund = () =>
    selected &&
    run(async () => {
      try {
        const r = await getDataSource(mode).transactions.refund(selected.id);
        setRefundTxn(r);
        showToast({ message: 'Refunded', description: `Refund ${r.reference} created.` });
        refetch();
      } finally {
        setConfirmRefund(false);
      }
    }, 'Could not refund the transaction.');

  const refunded = !!refundTxn;
  const refundReason = selected
    ? refundBlockReason(selected, refunded) ?? (refundTxn === undefined && selected.type === 'credit' ? 'Checking refund status...' : null)
    : null;
  const statusLock = selected ? statusLockReason(selected, refunded) : null;

  const columns: Column<Transaction>[] = [
    { key: 'date', header: 'Date', render: (t) => fmtDateTime(t.date) },
    { key: 'reference', header: 'Reference', render: (t) => <span className="font-mono text-xs">{t.reference}</span> },
    { key: 'customer', header: 'Customer', render: (t) => customerName(t.customerId) },
    { key: 'type', header: 'Type', render: (t) => <span className="capitalize">{t.type}</span> },
    { key: 'amount', header: 'Amount', render: (t) => <Amount t={t} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'channel', header: 'Channel', render: (t) => <span className="capitalize">{t.channel?.replace(/_/g, ' ') || '-'}</span> },
  ];

  const filtered = !!(search.trim() || status || type || range.from || range.to);

  return (
    <main>
      <HeaderSearch headerText="Transactions" headerDescription="View and manage your payments and payouts" />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by reference or description"
          aria-label="Search transactions"
          maxLength={100}
          className={`${field} w-full lg:max-w-xs`}
        />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select aria-label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={field}>
          <option value="">All types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <select aria-label="Date range" value={preset} onChange={(e) => { setPreset(e.target.value as DatePreset); setPage(1); }} className={field}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
        {preset === 'custom' && (
          <>
            <input type="date" aria-label="From date" value={customFrom} max={customTo || undefined} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} className={field} />
            <input type="date" aria-label="To date" value={customTo} min={customFrom || undefined} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} className={field} />
          </>
        )}
        <div className="lg:ml-auto">
          <CustomButton
            text="Export CSV"
            icon={<Download size={16} />}
            onClick={doExport}
            isLoading={exporting}
            disabled={exporting || loading || !data?.total}
          />
        </div>
      </div>
      {badRange && <p role="alert" className="mt-2 text-xs text-red-600">The From date must be on or before the To date.</p>}

      {error && (
        <div role="alert" className="mt-4 flex items-center justify-between rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" className="font-medium underline" onClick={refetch}>Retry</button>
        </div>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(t) => t.id}
          loading={loading}
          onRowClick={open}
          pagination={{ page, limit: LIMIT, total: data?.total ?? 0, onPageChange: setPage }}
          emptyTitle={filtered ? 'No transactions match your filters' : 'No transactions yet'}
          emptyDescription={filtered ? 'Try different filters or a wider date range.' : 'Payments and payouts will show up here.'}
        />
      </div>

      <Drawer open={!!selected} onClose={close} title="Transaction details">
        {selected && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-2xl font-semibold"><Amount t={selected} /></p>
              <div className="mt-1"><StatusBadge status={selected.status} /></div>
            </div>
            <dl className="grid grid-cols-[7rem_1fr] gap-y-2">
              <dt className="text-gray-500">Reference</dt>
              <dd className="break-all font-mono text-xs">{selected.reference}</dd>
              <dt className="text-gray-500">Date</dt>
              <dd>{fmtDateTime(selected.date)}</dd>
              <dt className="text-gray-500">Type</dt>
              <dd className="capitalize">{selected.type}</dd>
              <dt className="text-gray-500">Channel</dt>
              <dd className="capitalize">{selected.channel?.replace(/_/g, ' ') || '-'}</dd>
              <dt className="text-gray-500">Description</dt>
              <dd className="break-words">{selected.description || '-'}</dd>
              <dt className="text-gray-500">Customer</dt>
              <dd>{customerName(selected.customerId)}</dd>
              <dt className="text-gray-500">Payment link</dt>
              <dd>{selected.paymentLinkId ? link?.title ?? 'Loading...' : '-'}</dd>
              {selected.payoutId && (
                <>
                  <dt className="text-gray-500">Payout</dt>
                  <dd className="break-all font-mono text-xs">{selected.payoutId}</dd>
                </>
              )}
              {selected.refundOf && (
                <>
                  <dt className="text-gray-500">Refund of</dt>
                  <dd>
                    {original ? (
                      <button type="button" className="font-mono text-xs underline" onClick={() => open(original)}>{original.reference}</button>
                    ) : 'Loading...'}
                  </dd>
                </>
              )}
              {isCredit && (
                <>
                  <dt className="text-gray-500">Refund</dt>
                  <dd>
                    {refundTxn ? (
                      <button type="button" className="font-mono text-xs underline" onClick={() => open(refundTxn)}>{refundTxn.reference}</button>
                    ) : refundTxn === null ? 'Not refunded' : 'Checking...'}
                  </dd>
                </>
              )}
            </dl>

            <div>
              <label htmlFor="txn-status" className="mb-1 block font-medium">Status</label>
              <select
                id="txn-status"
                value={selected.status}
                disabled={busy || !!statusLock}
                onChange={(e) => e.target.value !== selected.status && setPendingStatus(e.target.value as TransactionStatus)}
                className={`${field} w-full disabled:opacity-60`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              {statusLock && <p className="mt-1 text-xs text-gray-500">{statusLock}</p>}
            </div>

            <div>
              <label htmlFor="txn-note" className="mb-1 block font-medium">Note</label>
              <textarea
                id="txn-note"
                value={noteDraft}
                maxLength={MAX_NOTE}
                rows={3}
                onChange={(e) => setNoteDraft(e.target.value)}
                className={`${field} w-full`}
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">{noteDraft.length}/{MAX_NOTE}</span>
                <CustomButton
                  text="Save note"
                  onClick={saveNote}
                  isLoading={busy && !pendingStatus && !confirmRefund}
                  disabled={busy || noteDraft.trim() === (selected.note ?? '')}
                />
              </div>
            </div>

            <div>
              <CustomButton text="Refund" onClick={() => setConfirmRefund(true)} disabled={busy || !!refundReason} />
              {refundReason && <p className="mt-1 text-xs text-gray-500">{refundReason}</p>}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!pendingStatus}
        title="Change status"
        message={`Mark ${selected?.reference ?? 'this transaction'} as ${pendingStatus}? This changes your balance if the transaction counts towards it.`}
        confirmLabel="Change status"
        loading={busy}
        onConfirm={changeStatus}
        onCancel={() => !busy && setPendingStatus(null)}
      />
      <ConfirmDialog
        open={confirmRefund}
        title="Refund transaction"
        message={`Refund ${selected ? formatMoney(selected.amount) : ''} for ${selected?.reference ?? 'this transaction'}? This creates a debit and cannot be undone.`}
        confirmLabel="Refund"
        destructive
        loading={busy}
        onConfirm={doRefund}
        onCancel={() => !busy && setConfirmRefund(false)}
      />
    </main>
  );
}
