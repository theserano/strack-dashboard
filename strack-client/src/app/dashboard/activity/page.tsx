'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  Headphones,
  Landmark,
  Link2,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react';
import HeaderSearch from '@/lib/components/HeaderSearch';
import { useActivity } from '@/lib/hooks/useActivity';
import { ACTIVITY_ENTITIES, eventHref, groupByDay } from '@/lib/data/activityView';
import { presetRange, type DatePreset } from '@/lib/data/transactionForm';

const LIMIT = 20;
const field = 'rounded-md border border-[#E1E4EA] px-3 py-2 text-sm';

const ICONS: Record<string, React.ElementType> = {
  customer: Users,
  'payment link': Link2,
  transaction: ArrowLeftRight,
  'bank account': Landmark,
  payout: Banknote,
  user: UserCircle,
  support_ticket: Headphones,
  settings: Settings,
};

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' });

export default function ActivityPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
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
      entity: entity || undefined,
      ...(badRange ? {} : range),
    }),
    [page, search, entity, range, badRange]
  );
  const { data, error, loading, refetch } = useActivity(params);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const groups = useMemo(() => groupByDay(data?.items ?? []), [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const filtered = !!(search.trim() || entity || preset !== 'all');

  // Past the end (filters changed or data was reset): go to the last page.
  useEffect(() => {
    if (!loading && total > 0 && page > totalPages) setPage(totalPages);
  }, [loading, total, page, totalPages]);

  return (
    <main>
      <HeaderSearch headerText="Activity Log" headerDescription="Track the changes made in your account" />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search activity"
          aria-label="Search activity"
          maxLength={100}
          className={`${field} w-full lg:max-w-xs`}
        />
        <select aria-label="Entity" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className={field}>
          <option value="">All activity</option>
          {ACTIVITY_ENTITIES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
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
      </div>
      {badRange && <p role="alert" className="mt-2 text-xs text-red-600">The From date must be on or before the To date.</p>}

      {error && (
        <div role="alert" className="mt-4 flex items-center justify-between rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" className="font-medium underline" onClick={refetch}>Retry</button>
        </div>
      )}

      <section className="mt-4 rounded-xl border border-[#E1E4EA] bg-white">
        {loading && !data ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-[#F7F9FC]" />
            ))}
          </div>
        ) : groups.length ? (
          groups.map((g) => (
            <div key={g.label}>
              <h2 className="border-b border-[#E1E4EA] bg-[#F7F9FC] px-5 py-2 text-xs font-medium uppercase tracking-wide text-[#525866]">
                {g.label}
              </h2>
              <ul className="divide-y divide-[#E1E4EA]">
                {g.items.map((e) => {
                  const Icon = ICONS[e.entity] ?? Activity;
                  const href = eventHref(e);
                  const body = (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F7F9FC]">
                        <Icon className="h-4 w-4 text-[#525866]" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm text-[#0E121B]">{e.description}</span>
                        <span className="block text-xs capitalize text-[#99A0AE]">{e.entity.replace('_', ' ')} · {e.action}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#99A0AE]">{fmtTime(e.date)}</span>
                    </>
                  );
                  return (
                    <li key={e.id}>
                      {href ? (
                        <button type="button" onClick={() => router.push(href)} className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-[#F7F9FC]">
                          {body}
                        </button>
                      ) : (
                        <div className="flex items-center gap-4 p-4">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        ) : (
          !error && (
            <div className="p-16 text-center">
              <Activity className="mx-auto mb-3 h-10 w-10 text-[#E1E4EA]" />
              <p className="text-sm font-medium text-[#0E121B]">{filtered ? 'No activity matches your filters' : 'No activity yet'}</p>
              <p className="mt-1 text-xs text-[#99A0AE]">
                {filtered ? 'Try different filters or a wider date range.' : 'Changes you make in your account will be recorded here.'}
              </p>
            </div>
          )
        )}

        {total > LIMIT && (
          <div className="flex items-center justify-between border-t border-[#E1E4EA] p-4 text-sm text-[#525866]">
            <span>Page {Math.min(page, totalPages)} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border border-[#E1E4EA] px-3 py-1.5 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="rounded-md border border-[#E1E4EA] px-3 py-1.5 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
