'use client';

import { useEffect, useState } from 'react';
import { usePendingAction } from '@/lib/hooks/usePendingAction';
import ErrorState from '@/lib/components/ErrorState';
import { Copy, Link2, Pencil, Play, Plus, Power, Trash2 } from 'lucide-react';
import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import CustomInput from '@/lib/components/CustomInput';
import CustomSelect from '@/lib/components/CustomSelect';
import DataTable, { type Column } from '@/lib/components/DataTable';
import Modal from '@/lib/components/Modal';
import ConfirmDialog from '@/lib/components/ConfirmDialog';
import StatusBadge from '@/lib/components/StatusBadge';
import { useAppSelector } from '@/lib/hook';
import { useLinkPayments, usePaymentLinks } from '@/lib/hooks/usePaymentLinks';
import { getDataSource } from '@/lib/data';
import {
  emptyPaymentLinkForm,
  parseNaira,
  validatePaymentLinkForm,
  type PaymentLinkForm,
} from '@/lib/data/paymentLinkForm';
import type { Customer, PaymentLink, PaymentLinkStatus } from '@/lib/data/types';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import { formatMoney, fromKobo } from '@/lib/utils/money';
import { showToast } from '@/lib/utils/plainFunctions';

const LIMIT = 10;

const toForm = (l: PaymentLink): PaymentLinkForm => ({
  title: l.title,
  amount: l.amount === undefined ? '' : String(fromKobo(l.amount)),
  description: l.description ?? '',
});

export default function PaymentPage() {
  const mode = useAppSelector((s) => s.auth.mode);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentLinkStatus | ''>('');
  const { data, error, loading, refetch } = usePaymentLinks(page, LIMIT, search, status);
  const [paidTick, setPaidTick] = useState(0);
  const payments = useLinkPayments(data?.items, paidTick);

  // Debounce the search box, and go back to page 1 when the term changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentLink | null>(null);
  const [form, setForm] = useState<PaymentLinkForm>(emptyPaymentLinkForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentLinkForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<PaymentLink | null>(null);
  const [removing, setRemoving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // Simulate payment
  const [paying, setPaying] = useState<PaymentLink | null>(null);
  const [payCustomer, setPayCustomer] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payError, setPayError] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submittingPay, setSubmittingPay] = useState(false);

  // The dataset changes with the mode: close anything that points at the old one.
  useEffect(() => {
    setFormOpen(false);
    setDeleting(null);
    setPaying(null);
    setPage(1);
  }, [mode]);

  useEffect(() => {
    if (!paying) return;
    let cancelled = false;
    setCustomers([]);
    getDataSource(mode)
      .customers.list({ limit: 1000, sort: 'name', direction: 'asc' })
      .then((r) => !cancelled && setCustomers(r.items))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [paying, mode]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPaymentLinkForm);
    setErrors({});
    setFormOpen(true);
  };
  const [pendingAction, clearPending] = usePendingAction(['new', 'simulate']);
  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction === 'new') {
      clearPending();
      openCreate();
      return;
    }
    if (loading) return;
    clearPending();
    const target = data?.items.find((l) => l.status === 'active');
    if (target) openPay(target);
    else openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, loading]);

  const openEdit = (l: PaymentLink) => {
    setEditing(l);
    setForm(toForm(l));
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return; // Enter in a field can submit twice while a save is in flight
    const v = validatePaymentLinkForm(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    const amount = parseNaira(form.amount) as number | undefined;
    setSaving(true);
    try {
      const ds = getDataSource(mode).paymentLinks;
      if (editing) {
        // On edit, null clears the amount (open link) and '' clears the description.
        await ds.update(editing.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          amount: (amount ?? null) as never,
        });
      } else {
        await ds.create({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          amount,
          status: 'active',
        });
      }
      showToast({ message: 'Saved', description: editing ? 'Payment link updated.' : 'Payment link created.' });
      setFormOpen(false);
      if (!editing) setPage(1);
      refetch();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not save the payment link.') });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (l: PaymentLink) => {
    if (toggling) return;
    setToggling(l.id);
    try {
      const next: PaymentLinkStatus = l.status === 'active' ? 'disabled' : 'active';
      await getDataSource(mode).paymentLinks.update(l.id, { status: next });
      showToast({ message: 'Saved', description: `Payment link ${next === 'active' ? 'enabled' : 'disabled'}.` });
      refetch();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not update the payment link.') });
    } finally {
      setToggling(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || removing) return;
    setRemoving(true);
    try {
      await getDataSource(mode).paymentLinks.remove(deleting.id);
      showToast({ message: 'Deleted', description: 'Payment link deleted.' });
      setDeleting(null);
      refetch();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not delete the payment link.') });
    } finally {
      setRemoving(false);
    }
  };

  const copyLink = async (l: PaymentLink) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pay/${l.slug}`);
      showToast({ message: 'Copied', description: 'Payment link copied to the clipboard.' });
    } catch {
      showToast({ message: 'Error', description: 'Could not copy the link.' });
    }
  };

  const openPay = (l: PaymentLink) => {
    setPaying(l);
    setPayCustomer('');
    setPayAmount('');
    setPayError('');
  };

  const submitPay = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submittingPay || !paying) return;
    const open = paying.amount === undefined;
    const parsed = open ? parseNaira(payAmount) : undefined;
    if (open && !parsed) {
      setPayError('Enter a valid amount (up to ₦1,000,000,000)');
      return;
    }
    const amount = parsed as number | undefined;
    setPayError('');
    setSubmittingPay(true);
    try {
      const t = await getDataSource(mode).paymentLinks.simulatePayment(paying.id, {
        amount,
        customerId: payCustomer || undefined,
      });
      showToast({ message: 'Payment received', description: `${formatMoney(t.amount)} received for ${paying.title}.` });
      setPaying(null);
      setPaidTick((n) => n + 1);
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not simulate the payment.') });
    } finally {
      setSubmittingPay(false);
    }
  };

  const columns: Column<PaymentLink>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (l) => (
        <div>
          <span className="font-medium text-gray-900">{l.title}</span>
          {l.description && <p className="max-w-xs truncate text-xs text-gray-500">{l.description}</p>}
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', render: (l) => (l.amount === undefined ? 'Open amount' : formatMoney(l.amount)) },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'payments',
      header: 'Payments',
      render: (l) => {
        const p = payments[l.id];
        if (!p) return '-';
        return p.total === undefined ? `${p.count}` : `${p.count} (${formatMoney(p.total)})`;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (l) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label={`Copy link for ${l.title}`} title="Demo link - public pay page not built yet" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => copyLink(l)}>
            <Copy size={16} />
          </button>
          <button
            type="button"
            aria-label={`Simulate payment for ${l.title}`}
            title={l.status === 'active' ? 'Simulate payment' : 'Enable the link to simulate a payment'}
            disabled={l.status !== 'active'}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => openPay(l)}
          >
            <Play size={16} />
          </button>
          <button
            type="button"
            aria-label={`${l.status === 'active' ? 'Disable' : 'Enable'} ${l.title}`}
            title={l.status === 'active' ? 'Disable' : 'Enable'}
            disabled={toggling === l.id}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            onClick={() => toggle(l)}
          >
            <Power size={16} />
          </button>
          <button type="button" aria-label={`Edit ${l.title}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => openEdit(l)}>
            <Pencil size={16} />
          </button>
          <button type="button" aria-label={`Delete ${l.title}`} className="rounded p-1.5 text-red-600 hover:bg-red-50" onClick={() => setDeleting(l)}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const setField = (k: keyof PaymentLinkForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const fieldError = (k: keyof PaymentLinkForm) =>
    errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k]}</p> : null;
  const filtered = !!search || !!status;

  return (
    <main>
      <HeaderSearch headerText="Payment links" headerDescription="Create and share links to get paid" />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or description"
            aria-label="Search payment links"
            maxLength={100}
            className="w-full rounded-md border border-[#E1E4EA] px-3 py-2 text-sm"
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentLinkStatus | '');
              setPage(1);
            }}
            className="rounded-md border border-[#E1E4EA] px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <CustomButton text="Create link" icon={<Plus size={16} />} onClick={openCreate} />
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(l) => l.id}
          loading={loading}
          pagination={{ page, limit: LIMIT, total: data?.total ?? 0, onPageChange: setPage }}
          emptyTitle={filtered ? 'No payment links match your filters' : 'No payment links yet'}
          emptyDescription={filtered ? 'Try a different search or status.' : 'Create your first link to start getting paid.'}
          emptyAction={filtered ? undefined : <CustomButton text="Create link" icon={<Link2 size={16} />} onClick={openCreate} />}
        />
      </div>

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Edit payment link' : 'Create payment link'}
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton text="Cancel" onClick={() => setFormOpen(false)} disabled={saving} />
            <CustomButton text={editing ? 'Save changes' : 'Create link'} onClick={() => submit()} isLoading={saving} disabled={saving} />
          </div>
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <div>
            <CustomInput id="link-title" label="Title" required value={form.title} onChange={setField('title')} error={!!errors.title} maxLength={100} />
            {fieldError('title')}
          </div>
          <div>
            <CustomInput id="link-amount" label="Amount (₦)" optional placeholder="Leave empty for an open amount" value={form.amount} onChange={setField('amount')} error={!!errors.amount} maxLength={20} />
            {fieldError('amount')}
          </div>
          <div>
            <label htmlFor="link-desc" className="mb-2 block text-sm font-medium">
              Description <span className="font-normal text-[#525866]">(Optional)</span>
            </label>
            <textarea
              id="link-desc"
              value={form.description}
              maxLength={500}
              rows={3}
              onChange={(e) => setField('description')(e.target.value)}
              className="w-full rounded-md border border-[#E1E4EA] px-3 py-2 text-sm"
            />
            {fieldError('description')}
          </div>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete payment link"
        message={`Delete ${deleting?.title ?? 'this link'}? Its past payments are kept but will no longer be linked to it.`}
        confirmLabel="Delete"
        destructive
        loading={removing}
        onConfirm={confirmDelete}
        onCancel={() => !removing && setDeleting(null)}
      />

      <Modal
        open={!!paying}
        onClose={() => !submittingPay && setPaying(null)}
        title="Simulate payment"
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton text="Cancel" onClick={() => setPaying(null)} disabled={submittingPay} />
            <CustomButton text="Simulate payment" onClick={() => submitPay()} isLoading={submittingPay} disabled={submittingPay} />
          </div>
        }
      >
        {paying && (
          <form onSubmit={submitPay} className="flex flex-col gap-3" noValidate>
            <p className="text-sm text-gray-600">
              {paying.title} -{' '}
              {paying.amount === undefined ? 'open amount' : formatMoney(paying.amount)}
            </p>
            {paying.amount === undefined && (
              <div>
                <CustomInput id="pay-amount" label="Amount (₦)" required value={payAmount} onChange={setPayAmount} error={!!payError} maxLength={20} />
                {payError && <p className="mt-1 text-xs text-red-600">{payError}</p>}
              </div>
            )}
            <CustomSelect
              id="pay-customer"
              label="Customer"
              optional
              placeholder="No customer"
              value={payCustomer}
              onChange={setPayCustomer}
              options={customers.map((c) => ({ label: `${c.name} (${c.email})`, value: c.id }))}
            />
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Modal>
    </main>
  );
}
