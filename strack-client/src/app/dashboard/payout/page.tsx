'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePendingAction } from '@/lib/hooks/usePendingAction';
import ErrorState from '@/lib/components/ErrorState';
import { Download, Plus, Star, Trash2, Wallet } from 'lucide-react';
import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import CustomInput from '@/lib/components/CustomInput';
import CustomSelect from '@/lib/components/CustomSelect';
import DataTable, { type Column } from '@/lib/components/DataTable';
import Drawer from '@/lib/components/Drawer';
import Modal from '@/lib/components/Modal';
import ConfirmDialog from '@/lib/components/ConfirmDialog';
import StatusBadge from '@/lib/components/StatusBadge';
import { useAppSelector } from '@/lib/hook';
import { usePayouts } from '@/lib/hooks/usePayouts';
import { useBankAccounts } from '@/lib/hooks/useBankAccounts';
import { useBalance } from '@/lib/hooks/useBalance';
import { getDataSource } from '@/lib/data';
import { NIGERIAN_BANKS } from '@/lib/data/banks';
import { fetchAllPages } from '@/lib/data/customerForm';
import { presetRange, type DatePreset } from '@/lib/data/transactionForm';
import {
  PAYOUT_FEE,
  bankLabel,
  emptyBankAccountForm,
  parseNairaInput,
  payoutAmountError,
  payoutBlockReason,
  payoutCsvColumns,
  validateBankAccountForm,
} from '@/lib/data/payoutForm';
import type { BankAccount, Payout, PayoutStatus } from '@/lib/data/types';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import { exportCsv } from '@/lib/utils/exportCsv';
import { formatMoney, formatMoneyOrDash } from '@/lib/utils/money';
import { showToast } from '@/lib/utils/plainFunctions';

const LIMIT = 10;
const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const STATUSES: PayoutStatus[] = ['successful', 'pending', 'failed'];
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const field = 'rounded-md border border-[#E1E4EA] px-3 py-2 text-sm';

export default function PayoutPage() {
  const mode = useAppSelector((s) => s.auth.mode);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [preset, setPreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  useEffect(() => {
    setRange(preset === 'custom' ? { from: customFrom || undefined, to: customTo || undefined } : presetRange(preset));
  }, [preset, customFrom, customTo]);
  const badRange = !!range.from && !!range.to && range.from > range.to;

  const params = useMemo(
    () => ({ page, limit: LIMIT, status: status || undefined, ...(badRange ? {} : range) }),
    [page, status, range, badRange]
  );
  const { data, error, loading, refetch } = usePayouts(params);
  const { balance, error: balanceError, refetch: refetchBalance } = useBalance();
  const accountsQ = useBankAccounts({ limit: 1000 });
  const accounts: BankAccount[] = accountsQ.data?.items ?? [];
  const accountById = (id: string) => accounts.find((a) => a.id === id);
  const labelFor = (pay: Payout) =>
    pay.bankName && pay.accountNumber ? bankLabel(pay as { bankName: string; accountNumber: string }) : accountsQ.data ? bankLabel(accountById(pay.bankAccountId)) : '...';

  /* ---------------- request payout ---------------- */
  const [requestOpen, setRequestOpen] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // One key per modal opening: a retry after a timeout or double click returns the same payout.
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const amount = parseNairaInput(amountText);
  const amountError = amountText.trim() === '' ? null : amount === null ? 'Enter a valid amount' : payoutAmountError(amount);
  const total = amount !== null && !amountError ? amount + PAYOUT_FEE : null;
  const blockReason = payoutBlockReason(balance, accounts.length > 0);
  const insufficient = total !== null && balance !== null && total > balance;
  const [pendingAction, clearPending] = usePendingAction();
  const canReview = !blockReason && amount !== null && !amountError && !insufficient && !!accountId;

  useEffect(() => {
    if (pendingAction !== 'new' || accountsQ.loading || balance === null || balance === undefined) return;
    clearPending();
    if (!blockReason) openRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, accountsQ.loading, balance, blockReason]);

  const openRequest = () => {
    setAmountText('');
    setAccountId(accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? '');
    setConfirming(false);
    setIdempotencyKey(newIdempotencyKey());
    setRequestOpen(true);
  };
  const closeRequest = () => {
    if (submitting) return;
    setRequestOpen(false);
    setConfirming(false);
  };

  const submitPayout = async () => {
    if (submitting || amount === null || !accountId) return;
    setSubmitting(true);
    try {
      const p = await getDataSource(mode).payouts.create({ amount, bankAccountId: accountId, idempotencyKey });
      showToast({ message: 'Payout requested', description: `${formatMoney(p.amount)} sent. Reference ${p.reference}.` });
      setRequestOpen(false);
      setPage(1);
      refetch();
      refetchBalance();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not request the payout.') });
      refetchBalance();
    } finally {
      setConfirming(false);
      setSubmitting(false);
    }
  };

  /* ---------------- history ---------------- */
  const [selected, setSelected] = useState<Payout | null>(null);
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { page: _p, limit: _l, ...filters } = params;
      void _p;
      void _l;
      const ds = getDataSource(mode);
      const accs = await fetchAllPages<BankAccount>(ds.bankAccounts.list, {});
      const rows = await fetchAllPages(ds.payouts.list, filters);
      if (!rows.length) {
        showToast({ message: 'Nothing to export', description: 'There are no payouts to export.' });
        return;
      }
      exportCsv(rows, payoutCsvColumns((id) => bankLabel(accs.find((a) => a.id === id))), 'payouts.csv');
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not export payouts.') });
    } finally {
      setExporting(false);
    }
  };

  /* ---------------- bank accounts ---------------- */
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyBankAccountForm);
  const [formErrors, setFormErrors] = useState<ReturnType<typeof validateBankAccountForm>>({});
  const [savingAccount, setSavingAccount] = useState(false);
  const [deleting, setDeleting] = useState<BankAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const saveAccount = async () => {
    if (savingAccount) return;
    const e = validateBankAccountForm(form);
    setFormErrors(e);
    if (Object.keys(e).length) return;
    setSavingAccount(true);
    try {
      await getDataSource(mode).bankAccounts.create({ ...form, accountName: form.accountName.trim() });
      showToast({ message: 'Saved', description: 'Bank account added.' });
      setAddOpen(false);
      accountsQ.refetch();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not add the bank account.') });
    } finally {
      setSavingAccount(false);
    }
  };

  const makeDefault = async (a: BankAccount) => {
    if (busyId) return;
    setBusyId(a.id);
    try {
      await getDataSource(mode).bankAccounts.update(a.id, { isDefault: true });
      accountsQ.refetch();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not change the default account.') });
    } finally {
      setBusyId(null);
    }
  };

  const removeAccount = async () => {
    if (!deleting || busyId) return;
    setBusyId(deleting.id);
    try {
      await getDataSource(mode).bankAccounts.remove(deleting.id);
      showToast({ message: 'Deleted', description: 'Bank account removed.' });
      accountsQ.refetch();
    } catch (err) {
      const has409 = (err as { response?: { status?: number } })?.response?.status === 409;
      showToast({
        message: has409 ? 'Cannot delete' : 'Error',
        description: getErrorMessage(err, 'Could not delete the bank account.'),
      });
    } finally {
      setDeleting(null);
      setBusyId(null);
    }
  };

  // The dataset changes with the mode: close anything that points at the old one.
  useEffect(() => {
    setSelected(null);
    setRequestOpen(false);
    setConfirming(false);
    setAddOpen(false);
    setDeleting(null);
    setPage(1);
  }, [mode]);

  const columns: Column<Payout>[] = [
    { key: 'date', header: 'Date', render: (p) => fmtDateTime(p.createdAt) },
    { key: 'reference', header: 'Reference', render: (p) => <span className="font-mono text-xs">{p.reference}</span> },
    { key: 'bank', header: 'Bank account', render: (p) => labelFor(p) },
    { key: 'amount', header: 'Amount', render: (p) => <span className="font-medium">{formatMoney(p.amount)}</span> },
    { key: 'fee', header: 'Fee', render: (p) => formatMoney(p.fee) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  ];
  const filtered = !!(status || range.from || range.to);
  const selectedAccount = selected ? accountById(selected.bankAccountId) : undefined;

  return (
    <main>
      <HeaderSearch headerText="Payouts" headerDescription="Withdraw your balance to a bank account" />

      <section className="mt-6 flex flex-col gap-4 rounded-lg border border-[#E1E4EA] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={28} className="text-[#525866]" />
          <div>
            <p className="text-sm text-[#525866]">Available balance</p>
            <p className="text-2xl font-semibold" aria-live="polite">{formatMoneyOrDash(balance)}</p>
            {balanceError && (
              <p role="alert" className="text-xs text-red-600">
                Could not load your balance. <button type="button" className="underline" onClick={refetchBalance}>Retry</button>
              </p>
            )}
          </div>
        </div>
        <div className="sm:w-56">
          <CustomButton text="Request payout" icon={<Plus size={16} />} onClick={openRequest} disabled={!!blockReason || accountsQ.loading} />
          {blockReason && <p className="mt-1 text-xs text-[#525866]">{blockReason}</p>}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <h2 className="text-lg font-semibold lg:mr-4">Payout history</h2>
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
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
          <CustomButton text="Export CSV" icon={<Download size={16} />} onClick={doExport} isLoading={exporting} disabled={exporting || loading || !data?.total} />
        </div>
      </div>
      {badRange && <p role="alert" className="mt-2 text-xs text-red-600">The From date must be on or before the To date.</p>}

      {error && <ErrorState message={error} onRetry={refetch} />}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(p) => p.id}
          loading={loading}
          onRowClick={setSelected}
          pagination={{ page, limit: LIMIT, total: data?.total ?? 0, onPageChange: setPage }}
          emptyTitle={filtered ? 'No payouts match your filters' : 'No payouts yet'}
          emptyDescription={filtered ? 'Try different filters or a wider date range.' : 'Request a payout to move money to your bank account.'}
          emptyAction={filtered || blockReason ? undefined : <CustomButton text="Request payout" icon={<Plus size={16} />} onClick={openRequest} />}
        />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bank accounts</h2>
          <div className="w-44">
            <CustomButton
              text="Add account"
              icon={<Plus size={16} />}
              onClick={() => { setForm(emptyBankAccountForm); setFormErrors({}); setAddOpen(true); }}
            />
          </div>
        </div>
        {accountsQ.error && <ErrorState message={accountsQ.error} onRetry={accountsQ.refetch} />}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-[#E1E4EA] p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {a.bankName}
                  {a.isDefault && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Default</span>}
                </p>
                <p className="font-mono text-sm">{a.accountNumber}</p>
                <p className="truncate text-sm text-[#525866]">{a.accountName}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!a.isDefault && (
                  <button type="button" disabled={!!busyId} onClick={() => makeDefault(a)} className="flex items-center gap-1 text-sm underline disabled:opacity-50">
                    <Star size={14} /> Set default
                  </button>
                )}
                <button type="button" disabled={!!busyId} onClick={() => setDeleting(a)} aria-label={`Delete ${a.bankName} ${a.accountNumber}`} className="text-red-600 disabled:opacity-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {accountsQ.data && !accounts.length && <p className="mt-3 text-sm text-[#525866]">No bank accounts yet. Add one to request a payout.</p>}
      </section>

      <Modal
        open={requestOpen}
        onClose={closeRequest}
        title="Request payout"
        footer={
          <div className="flex gap-3">
            <CustomButton text="Cancel" onClick={closeRequest} className="!bg-white !text-[#020C14] border border-[#E1E4EA]" />
            <CustomButton text="Review" onClick={() => setConfirming(true)} disabled={!canReview || submitting} />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <CustomInput id="payout-amount" label="Amount (NGN)" value={amountText} onChange={setAmountText} placeholder="0.00" error={!!amountError || insufficient} maxLength={15} />
          {amountError && <p role="alert" className="-mt-2 text-xs text-red-600">{amountError}</p>}
          <CustomSelect
            id="payout-account"
            label="Bank account"
            value={accountId}
            onChange={setAccountId}
            options={accounts.map((a) => ({ value: a.id, label: `${bankLabel(a)} - ${a.accountName}` }))}
          />
          <dl className="grid grid-cols-2 gap-y-1 rounded-md bg-[#F6F8FA] p-3 text-sm">
            <dt>Fee</dt><dd className="text-right">{formatMoney(PAYOUT_FEE)}</dd>
            <dt className="font-medium">Total debited</dt><dd className="text-right font-medium">{total === null ? '-' : formatMoney(total)}</dd>
            <dt>Available</dt><dd className="text-right">{formatMoneyOrDash(balance)}</dd>
          </dl>
          {insufficient && <p role="alert" className="text-xs text-red-600">Insufficient balance for this amount plus the fee.</p>}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirming}
        title="Confirm payout"
        message={
          amount !== null && (
            <>Send {formatMoney(amount)} to {bankLabel(accountById(accountId))}? A fee of {formatMoney(PAYOUT_FEE)} applies, so {formatMoney(amount + PAYOUT_FEE)} will be debited.</>
          )
        }
        confirmLabel="Send payout"
        loading={submitting}
        onConfirm={submitPayout}
        onCancel={() => !submitting && setConfirming(false)}
      />

      <Modal
        open={addOpen}
        onClose={() => !savingAccount && setAddOpen(false)}
        title="Add bank account"
        footer={
          <div className="flex gap-3">
            <CustomButton text="Cancel" onClick={() => setAddOpen(false)} disabled={savingAccount} className="!bg-white !text-[#020C14] border border-[#E1E4EA]" />
            <CustomButton text="Save" onClick={saveAccount} isLoading={savingAccount} disabled={savingAccount} />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <CustomSelect id="bank-name" label="Bank" required value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} error={!!formErrors.bankName} options={NIGERIAN_BANKS.map((b) => ({ value: b, label: b }))} placeholder="Select a bank" />
          {formErrors.bankName && <p role="alert" className="-mt-2 text-xs text-red-600">{formErrors.bankName}</p>}
          <CustomInput id="bank-number" label="Account number" required value={form.accountNumber} maxLength={10} onChange={(v) => setForm({ ...form, accountNumber: v.replace(/\D/g, '') })} error={!!formErrors.accountNumber} placeholder="10 digits" />
          {formErrors.accountNumber && <p role="alert" className="-mt-2 text-xs text-red-600">{formErrors.accountNumber}</p>}
          <CustomInput id="bank-holder" label="Account name" required value={form.accountName} maxLength={100} onChange={(v) => setForm({ ...form, accountName: v })} error={!!formErrors.accountName} />
          {formErrors.accountName && <p role="alert" className="-mt-2 text-xs text-red-600">{formErrors.accountName}</p>}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Make this my default account
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete bank account"
        message={deleting && `Delete ${bankLabel(deleting)}? Accounts that have payouts cannot be deleted.`}
        confirmLabel="Delete"
        destructive
        loading={!!busyId}
        onConfirm={removeAccount}
        onCancel={() => !busyId && setDeleting(null)}
      />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Payout details">
        {selected && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-[#525866]">Reference</dt><dd className="font-mono">{selected.reference}</dd>
            <dt className="text-[#525866]">Status</dt><dd><StatusBadge status={selected.status} /></dd>
            <dt className="text-[#525866]">Date</dt><dd>{fmtDateTime(selected.createdAt)}</dd>
            <dt className="text-[#525866]">Amount</dt><dd>{formatMoney(selected.amount)}</dd>
            <dt className="text-[#525866]">Fee</dt><dd>{formatMoney(selected.fee)}</dd>
            <dt className="text-[#525866]">Total debited</dt><dd className="font-medium">{formatMoney(selected.amount + selected.fee)}</dd>
            <dt className="text-[#525866]">Bank</dt><dd>{selected.bankName ?? selectedAccount?.bankName ?? (accountsQ.data ? 'Deleted account' : '...')}</dd>
            <dt className="text-[#525866]">Account number</dt><dd className="font-mono">{selected.accountNumber ?? selectedAccount?.accountNumber ?? '-'}</dd>
            <dt className="text-[#525866]">Account name</dt><dd>{selectedAccount?.accountName ?? '-'}</dd>
          </dl>
        )}
      </Drawer>
    </main>
  );
}
