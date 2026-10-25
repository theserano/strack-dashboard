'use client';

import { useEffect, useState } from 'react';
import { Download, Pencil, Plus, Trash2, Users } from 'lucide-react';
import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import CustomInput from '@/lib/components/CustomInput';
import DataTable, { type Column } from '@/lib/components/DataTable';
import Modal from '@/lib/components/Modal';
import ConfirmDialog from '@/lib/components/ConfirmDialog';
import StatusBadge from '@/lib/components/StatusBadge';
import { useAppSelector } from '@/lib/hook';
import { useCustomers } from '@/lib/hooks/useCustomers';
import { getDataSource } from '@/lib/data';
import {
  customerCsvColumns,
  emptyCustomerForm,
  fetchAllPages,
  validateCustomerForm,
  type CustomerForm,
} from '@/lib/data/customerForm';
import type { Customer, Transaction } from '@/lib/data/types';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import { exportCsv } from '@/lib/utils/exportCsv';
import { formatMoney } from '@/lib/utils/money';
import { showToast } from '@/lib/utils/plainFunctions';

const LIMIT = 10;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });

const toForm = (c: Customer): CustomerForm => ({
  name: c.name,
  email: c.email,
  phone: c.phone ?? '',
  notes: c.notes ?? '',
});

export default function CustomerPage() {
  const mode = useAppSelector((s) => s.auth.mode);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, loading, refetch } = useCustomers(page, LIMIT, search);

  // Debounce the search box, and go back to page 1 when the term changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Form modal (create when editing is null)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyCustomerForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [removing, setRemoving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Detail modal
  const [detail, setDetail] = useState<Customer | null>(null);
  const [recent, setRecent] = useState<{ items: Transaction[]; total: number } | null>(null);
  const [recentError, setRecentError] = useState(false);

  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    setRecent(null);
    setRecentError(false);
    getDataSource(mode)
      .transactions.list({ customerId: detail.id, limit: 5 })
      .then((r) => !cancelled && setRecent({ items: r.items, total: r.total }))
      .catch(() => !cancelled && setRecentError(true));
    return () => {
      cancelled = true;
    };
  }, [detail, mode]);

  // The dataset changes with the mode: close anything that points at the old one.
  useEffect(() => {
    setFormOpen(false);
    setDeleting(null);
    setDetail(null);
    setPage(1);
  }, [mode]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCustomerForm);
    setErrors({});
    setFormOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm(toForm(c));
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return; // Enter in a field can submit twice while a save is in flight
    const v = validateCustomerForm(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    try {
      const ds = getDataSource(mode).customers;
      if (editing) {
        // On edit, send '' so a cleared optional field is cleared rather than left unchanged.
        await ds.update(editing.id, { ...body, phone: form.phone.trim(), notes: form.notes.trim() });
      } else {
        await ds.create(body);
      }
      showToast({ message: 'Saved', description: editing ? 'Customer updated.' : 'Customer added.' });
      setFormOpen(false);
      if (!editing) setPage(1);
      refetch();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not save the customer.') });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await getDataSource(mode).customers.remove(deleting.id);
      showToast({ message: 'Deleted', description: 'Customer deleted.' });
      if (detail?.id === deleting.id) setDetail(null);
      setDeleting(null);
      refetch();
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not delete the customer.') });
    } finally {
      setRemoving(false);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllPages(getDataSource(mode).customers.list, { search: search.trim() || undefined });
      if (!rows.length) {
        showToast({ message: 'Nothing to export', description: 'There are no customers to export.' });
        return;
      }
      exportCsv(rows, customerCsvColumns, 'customers.csv');
    } catch (err) {
      showToast({ message: 'Error', description: getErrorMessage(err, 'Could not export customers.') });
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
    { key: 'email', header: 'Email', render: (c) => c.email },
    { key: 'phone', header: 'Phone', render: (c) => c.phone || '-' },
    { key: 'createdAt', header: 'Created', render: (c) => fmtDate(c.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label={`Edit ${c.name}`}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
            onClick={() => openEdit(c)}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${c.name}`}
            className="rounded p-1.5 text-red-600 hover:bg-red-50"
            onClick={() => setDeleting(c)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const setField = (k: keyof CustomerForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const fieldError = (k: keyof CustomerForm) =>
    errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k]}</p> : null;

  return (
    <main>
      <HeaderSearch headerText="Customers" headerDescription="Manage your customer base" />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email or phone"
          aria-label="Search customers"
          maxLength={100}
          className="w-full rounded-md border border-[#E1E4EA] px-3 py-2 text-sm sm:max-w-xs"
        />
        <div className="flex gap-2">
          <CustomButton
            text="Export CSV"
            icon={<Download size={16} />}
            onClick={doExport}
            isLoading={exporting}
            disabled={exporting || loading || !data?.total}
          />
          <CustomButton text="Add customer" icon={<Plus size={16} />} onClick={openCreate} />
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-center justify-between rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" className="font-medium underline" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(c) => c.id}
          loading={loading}
          onRowClick={setDetail}
          pagination={{ page, limit: LIMIT, total: data?.total ?? 0, onPageChange: setPage }}
          emptyTitle={search ? 'No customers match your search' : 'No customers yet'}
          emptyDescription={search ? 'Try a different name, email or phone.' : 'Add your first customer to get started.'}
          emptyAction={
            search ? undefined : <CustomButton text="Add customer" icon={<Users size={16} />} onClick={openCreate} />
          }
        />
      </div>

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? 'Edit customer' : 'Add customer'}
        footer={
          <div className="flex justify-end gap-2">
            <CustomButton text="Cancel" onClick={() => setFormOpen(false)} disabled={saving} />
            <CustomButton text={editing ? 'Save changes' : 'Add customer'} onClick={() => submit()} isLoading={saving} disabled={saving} />
          </div>
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <div>
            <CustomInput id="cust-name" label="Name" required value={form.name} onChange={setField('name')} error={!!errors.name} maxLength={100} />
            {fieldError('name')}
          </div>
          <div>
            <CustomInput id="cust-email" label="Email" type="email" required value={form.email} onChange={setField('email')} error={!!errors.email} maxLength={254} />
            {fieldError('email')}
          </div>
          <div>
            <CustomInput id="cust-phone" label="Phone" optional value={form.phone} onChange={setField('phone')} error={!!errors.phone} maxLength={30} />
            {fieldError('phone')}
          </div>
          <div>
            <label htmlFor="cust-notes" className="mb-2 block text-sm font-medium">
              Notes <span className="font-normal text-[#525866]">(Optional)</span>
            </label>
            <textarea
              id="cust-notes"
              value={form.notes}
              maxLength={1000}
              rows={3}
              onChange={(e) => setField('notes')(e.target.value)}
              className="w-full rounded-md border border-[#E1E4EA] px-3 py-2 text-sm"
            />
            {fieldError('notes')}
          </div>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete customer"
        message={`Delete ${deleting?.name ?? 'this customer'}? Their transactions are kept but will no longer be linked to them.`}
        confirmLabel="Delete"
        destructive
        loading={removing}
        onConfirm={confirmDelete}
        onCancel={() => !removing && setDeleting(null)}
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'Customer'}>
        {detail && (
          <div className="flex flex-col gap-4 text-sm">
            <dl className="grid grid-cols-[6rem_1fr] gap-y-2">
              <dt className="text-gray-500">Email</dt>
              <dd className="break-all">{detail.email}</dd>
              <dt className="text-gray-500">Phone</dt>
              <dd>{detail.phone || '-'}</dd>
              <dt className="text-gray-500">Created</dt>
              <dd>{fmtDate(detail.createdAt)}</dd>
              <dt className="text-gray-500">Notes</dt>
              <dd className="whitespace-pre-wrap break-words">{detail.notes || '-'}</dd>
            </dl>
            <div>
              <h3 className="mb-2 font-medium">
                Recent transactions{recent ? ` (${recent.total} total)` : ''}
              </h3>
              {recentError ? (
                <p className="text-gray-500">Transactions are not available yet.</p>
              ) : !recent ? (
                <p className="text-gray-500">Loading...</p>
              ) : recent.items.length === 0 ? (
                <p className="text-gray-500">No transactions for this customer.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recent.items.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                      <div>
                        <p>{t.description || t.reference}</p>
                        <p className="text-xs text-gray-500">{fmtDate(t.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={t.type === 'debit' ? 'text-red-600' : ''}>
                          {t.type === 'debit' ? '-' : ''}
                          {formatMoney(t.amount)}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <CustomButton text="Edit" onClick={() => { const c = detail; setDetail(null); openEdit(c); }} />
              <CustomButton text="Delete" onClick={() => { const c = detail; setDetail(null); setDeleting(c); }} />
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
