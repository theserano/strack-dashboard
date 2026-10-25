'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import ErrorState from '@/lib/components/ErrorState';
import CustomButton from '@/lib/components/CustomButton';
import CustomInput from '@/lib/components/CustomInput';
import CustomSelect from '@/lib/components/CustomSelect';
import DataTable, { type Column } from '@/lib/components/DataTable';
import Drawer from '@/lib/components/Drawer';
import Modal from '@/lib/components/Modal';
import ConfirmDialog from '@/lib/components/ConfirmDialog';
import StatusBadge from '@/lib/components/StatusBadge';
import { useAppSelector } from '@/lib/hook';
import { useSupportTickets } from '@/lib/hooks/useSupportTickets';
import { getDataSource } from '@/lib/data';
import { TICKET_CATEGORIES, type SupportTicket, type SupportTicketSummary, type TicketCategory } from '@/lib/data/types';
import { getErrorMessage } from '@/lib/features/user/thunkActions';
import { showToast } from '@/lib/utils/plainFunctions';
import { FileQuestion, Mail, MessageCircle, Phone, Plus, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const LIMIT = 10;
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((c) => ({ value: c, label: cap(c) }));
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];
const textarea =
  'w-full px-3 py-2 border border-[#E1E4EA] rounded-lg text-sm resize-none focus:outline-none focus:border-[#020C14] placeholder:text-[#99A0AE]';

const faqItems = [
  {
    question: 'How do I verify my account?',
    answer:
      'Go to the Compliance section in your dashboard and complete all verification steps including personal information, business details, and document upload.',
  },
  {
    question: 'How long does verification take?',
    answer:
      'Account verification typically takes 1-3 business days after submitting all required documents.',
  },
  {
    question: 'How do I create a payment link?',
    answer:
      'Navigate to the Payments page and click "Create Link". Fill in the payment details and share the generated link with your customers.',
  },
  {
    question: 'What are the transaction fees?',
    answer:
      'Transaction fees vary based on your account type and transaction volume. Contact support for detailed pricing information.',
  },
  {
    question: 'How do I withdraw funds?',
    answer:
      'Go to the Payouts section, add your bank account details, and initiate a withdrawal from your available balance.',
  },
];


function NewTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (t: SupportTicket) => void }) {
  const mode = useAppSelector((s) => s.auth.mode);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('account');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (open) {
      setSubject('');
      setCategory('account');
      setMessage('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (submitting.current) return;
    const s = subject.trim();
    const m = message.trim();
    if (s.length < 3 || s.length > 120) return setError('Subject must be between 3 and 120 characters');
    if (m.length < 10 || m.length > 2000) return setError('Message must be between 10 and 2000 characters');
    setError(null);
    submitting.current = true;
    setBusy(true);
    try {
      const t = await getDataSource(mode).support.create({ subject: s, category, message: m });
      showToast({ message: 'Ticket opened', description: "We've received your ticket." });
      onCreated(t);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="New ticket"
      footer={
        <>
          <CustomButton text="Cancel" className="!w-auto px-4 !h-9 text-sm" onClick={onClose} disabled={busy} />
          <CustomButton text="Submit ticket" icon={<Send className="w-4 h-4" />} className="!w-auto px-4 !h-9 text-sm" onClick={submit} isLoading={busy} disabled={busy} />
        </>
      }
    >
      <div className="space-y-4">
        <CustomInput id="ticket-subject" label="Subject" value={subject} onChange={setSubject} placeholder="What do you need help with?" maxLength={120} required />
        <CustomSelect id="ticket-category" label="Category" value={category} options={CATEGORY_OPTIONS} onChange={(v) => setCategory(v as TicketCategory)} />
        <div className="grid w-full items-center gap-2">
          <label className="text-sm font-medium" htmlFor="ticket-message">
            Message
          </label>
          <textarea id="ticket-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue in detail..." rows={5} maxLength={2000} className={textarea} />
          <p className="text-xs text-[#99A0AE]">{message.trim().length}/2000 (at least 10 characters)</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function TicketDrawer({ ticket, onClose, onChanged }: { ticket: SupportTicket | null; onClose: () => void; onChanged: (t: SupportTicket) => void }) {
  const mode = useAppSelector((s) => s.auth.mode);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const submitting = useRef(false);
  const id = ticket?.id;

  useEffect(() => {
    setReply('');
    setError(null);
    setConfirming(false);
  }, [id]);

  // The ticket the action was started on; if another ticket is open when it finishes, its result is ignored.
  const idRef = useRef(id);
  idRef.current = id;

  const run = async (ticketId: string, fn: () => Promise<SupportTicket>, done?: () => void) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const t = await fn();
      if (idRef.current !== ticketId) return;
      onChanged(t);
      done?.();
    } catch (e) {
      if (idRef.current !== ticketId) return;
      setError(getErrorMessage(e));
      setConfirming(false);
      // 409: the ticket changed under us (closed, or full). Reload it so the drawer shows the truth.
      if ((e as { response?: { status?: number } })?.response?.status === 409) {
        getDataSource(mode).support.get(ticketId).then((t) => idRef.current === ticketId && onChanged(t)).catch(() => {});
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const send = () => {
    if (!ticket) return;
    const m = reply.trim();
    if (!m) return setError('Write a reply first');
    void run(ticket.id, () => getDataSource(mode).support.reply(ticket.id, m), () => setReply(''));
  };
  const close = () => {
    if (!ticket) return;
    void run(ticket.id, () => getDataSource(mode).support.close(ticket.id), () => {
      setConfirming(false);
      showToast({ message: 'Ticket closed', description: 'You can open a new ticket any time.' });
    });
  };

  const closed = ticket?.status === 'closed';
  return (
    <Drawer open={!!ticket} onClose={onClose} title={ticket?.subject ?? 'Ticket'}>
      {ticket && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-xs text-[#525866]">
            <StatusBadge status={ticket.status} />
            <span>{cap(ticket.category)}</span>
            <span>Opened {fmtDateTime(ticket.createdAt)}</span>
          </div>
          <ol className="space-y-3" aria-label="Conversation">
            <li className="rounded-lg bg-[#F7F9FC] p-3">
              <p className="text-xs font-medium text-[#525866]">You</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#0E121B]">{ticket.message}</p>
            </li>
            {ticket.replies.map((r) => (
              <li key={r.id} className={`rounded-lg p-3 ${r.from === 'support' ? 'border border-[#E1E4EA] bg-white' : 'bg-[#F7F9FC]'}`}>
                <p className="text-xs font-medium text-[#525866]">
                  {r.from === 'support' ? 'Support' : 'You'} <span className="font-normal text-[#99A0AE]">{fmtDateTime(r.date)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#0E121B]">{r.message}</p>
              </li>
            ))}
          </ol>
          {closed ? (
            <p className="text-sm text-[#525866]">This ticket is closed. Open a new ticket if you still need help.</p>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium" htmlFor="ticket-reply">
                Reply
              </label>
              <textarea id="ticket-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={4} maxLength={2000} placeholder="Write a reply..." className={textarea} disabled={busy} />
              <div className="flex gap-2">
                <CustomButton text="Send reply" icon={<Send className="w-4 h-4" />} className="!w-auto px-4 !h-9 text-sm" onClick={send} isLoading={busy && !confirming} disabled={busy} />
                <CustomButton text="Close ticket" className="!w-auto px-4 !h-9 text-sm" onClick={() => setConfirming(true)} disabled={busy} />
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title="Close this ticket?"
        message="You won't be able to reply once it is closed."
        confirmLabel="Close ticket"
        destructive
        loading={busy}
        onConfirm={close}
        onCancel={() => setConfirming(false)}
      />
    </Drawer>
  );
}

export default function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const mode = useAppSelector((s) => s.auth.mode);
  const { data, error, loading, refetch } = useSupportTickets({ page, limit: LIMIT, status: status || undefined });

  useEffect(() => {
    setSelectedId(null);
    setPage(1);
  }, [mode]);

  // The list rows carry no thread: load the full ticket whenever one is selected.
  useEffect(() => {
    setSelected(null);
    setDetailError(null);
    if (!selectedId) return;
    let current = true;
    getDataSource(mode)
      .support.get(selectedId)
      .then((t) => current && setSelected(t))
      .catch((e) => {
        if (!current) return;
        setSelectedId(null);
        setDetailError(getErrorMessage(e));
      });
    return () => {
      current = false;
    };
  }, [selectedId, mode]);

  const columns: Column<SupportTicketSummary>[] = [
    { key: 'subject', header: 'Subject', render: (t) => <span className="font-medium text-[#0E121B]">{t.subject}</span> },
    { key: 'category', header: 'Category', render: (t) => cap(t.category) },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'replies', header: 'Replies', render: (t) => t.replyCount },
    { key: 'createdAt', header: 'Opened', render: (t) => fmtDateTime(t.createdAt) },
  ];

  return (
    <main>
      <HeaderSearch headerText="Support" headerDescription="Get help with your account and services" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Email Support', value: 'support@strack.com', icon: Mail },
          { label: 'Phone Support', value: '+234 800 000 0000', icon: Phone },
          { label: 'Live Chat', value: 'Available 9am - 5pm', icon: MessageCircle },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="border border-[#E1E4EA] rounded-xl p-5 bg-white flex items-center gap-4 hover:bg-[#F7F9FC] cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#F7F9FC] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#525866]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0E121B]">{item.label}</p>
                <p className="text-xs text-[#99A0AE]">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>


      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-base font-semibold text-[#0E121B]">Your tickets</h3>
          <div className="flex items-end gap-3">
            <div className="w-[160px]">
              <CustomSelect id="ticket-status-filter" value={status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
            </div>
            <CustomButton text="New ticket" icon={<Plus className="w-4 h-4" />} className="!w-auto px-4 !h-10 text-sm" onClick={() => setCreating(true)} />
          </div>
        </div>
        {(error || detailError) && <ErrorState message={(error ?? detailError) as string} onRetry={error ? refetch : undefined} className="mt-3" />}
        <div className="mt-4">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(t) => t.id}
            loading={loading}
            onRowClick={(t) => setSelectedId(t.id)}
            pagination={{ page, limit: LIMIT, total: data?.total ?? 0, onPageChange: setPage }}
            emptyTitle={status ? 'No tickets match this filter' : 'No tickets yet'}
            emptyDescription={status ? 'Try a different status.' : 'Open a ticket and our team will get back to you.'}
            emptyAction={status ? undefined : <CustomButton text="New ticket" icon={<Plus className="w-4 h-4" />} className="!w-auto px-4 !h-10 text-sm" onClick={() => setCreating(true)} />}
          />
        </div>
      </section>

      <div className="mt-8">
        <section className="border border-[#E1E4EA] rounded-xl bg-white">
          <div className="p-5 border-b border-[#E1E4EA]">
            <h3 className="text-base font-semibold text-[#0E121B] flex items-center gap-2">
              <FileQuestion className="w-5 h-5" />
              Frequently Asked Questions
            </h3>
          </div>
          <div className="divide-y divide-[#E1E4EA]">
            {faqItems.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full text-left p-5 flex items-center justify-between hover:bg-[#F7F9FC] transition-colors"
                >
                  <span className="text-sm font-medium text-[#0E121B] pr-4">{faq.question}</span>
                  <span
                    className={`text-[#525866] transition-transform shrink-0 ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 6l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                {expandedFaq === index && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-[#525866]">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>

      <NewTicketModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(t) => {
          setCreating(false);
          setSelectedId(t.id);
          setPage(1);
          refetch();
        }}
      />
      <TicketDrawer
        ticket={selected}
        onClose={() => setSelectedId(null)}
        onChanged={(t) => {
          setSelected(t);
          refetch();
        }}
      />
    </main>
  );
}
