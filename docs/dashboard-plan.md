# Strack dashboard plan

Goal: turn the dashboard from static mockups into a working app where users create, edit and
delete their own data, plus a **demo mode** that runs entirely in the browser so the app still
works when MongoDB Atlas is paused or Render is asleep.

## Where things stand (2026-10-25)

**All phases (0-7) are done.** Every dashboard page works in both demo and live mode, with loading,
error (Retry) and empty states, and a mobile layout. See the README for the demo walkthrough.

Order change: the Overview (phase 5 in the table below) was pulled forward and built right after
demo mode, so the stats endpoint and the local stats existed before customers and transactions
were wired up. The remaining phases then ran in table order.

| Page | Status |
|---|---|
| Overview, Customers, Payment links, Transactions, Payouts | Done (demo + live) |
| Activity log, Settings, Support | Done (demo + live) |
| Compliance | Done |
| Polish (states, mobile, Quick Actions, README) | Done |

## The core idea: one data layer, two backends

Pages never call `api` directly. They call a **data source** with the same functions in two versions:

```
page -> redux thunk -> dataSource.customers.create(...)
                          |-- apiSource    -> Express -> MongoDB    (real users)
                          '-- localSource  -> localStorage          (demo user)
```

- `src/lib/data/types.ts`: the shared types (Customer, Transaction, PaymentLink, ...).
- `src/lib/data/apiSource.ts`: calls the server.
- `src/lib/data/localSource.ts`: reads and writes `localStorage` (IndexedDB for uploaded files).
- `src/lib/data/index.ts`: `getDataSource()` returns one or the other based on `session.mode`
  (`'live' | 'demo'`).

Because both versions follow one interface, every feature built once works in demo mode for free.
This is why demo mode comes first: building it early forces every later feature through the layer.

## Data model

Everything belongs to one user. Records link to each other, so actions have visible effects
elsewhere in the app.

| Entity | Key fields | Links |
|---|---|---|
| Customer | name, email, phone, notes, createdAt | has many transactions |
| PaymentLink | title, amount (or open amount), description, status (active/disabled), slug | has many transactions |
| Transaction | type (credit/debit), amount, status (successful/pending/failed), reference, channel, description, date | customer?, paymentLink?, payout? |
| BankAccount | bank name, account number, account name, isDefault | used by payouts |
| Payout | amount, fee, status, reference | bankAccount; creates a debit transaction |
| ActivityEvent | action, entity, entityId, description, date | written automatically on every change |
| SupportTicket | subject, category, message, status, replies[] | — |
| Settings | notification prefs, currency, theme | stored on the user |

**Balance** is never stored. It's worked out as successful credits minus successful debits, so it
can't drift out of sync.

### Interactions that make it feel real

- **Payment link -> "Simulate payment"**: creates a credit transaction, and the customer too if new.
  Balance and the Overview update.
- **Payout**: checks the balance, creates a payout and a debit transaction, then moves it from
  pending to successful (instantly in demo mode).
- **Transaction detail**: change status, add a note, issue a refund (creates a linked debit).
- **Every create, edit and delete** writes an ActivityEvent, so the Activity Log fills itself.
- **Overview**: totals, a revenue chart (by day, week or month), top customers and recent
  activity, all computed from the data above.

## Demo mode

- **Entry**: a "Try the demo" button on the login page (and a line on the landing page). No password.
  It sets `session.mode = 'demo'` and goes to `/dashboard/user`.
- **Seed data**: `src/lib/data/seed.ts` builds about 90 days of believable data: around 40
  customers, 8 payment links, about 250 transactions, 6 payouts, 2 bank accounts, activity and
  tickets, plus a completed, verified compliance profile. Dates are relative to "today", so the
  data never looks stale.
- **Persistence**: changes are saved to `localStorage` under `strack:demo:*`, so a recruiter's
  edits survive a reload.
- **Reset**: a "Reset demo data" button in Settings and in a slim banner ("You're in demo mode.
  Changes are saved in this browser only.").
- **No network**: in demo mode the axios instance is never used. Add a guard that throws if
  it is, so leaks get caught in development.
- **Fallback**: if login fails because the server is unreachable or times out, show "Our server is
  waking up. Try the demo instead?". Render's free tier sleeps and Atlas free clusters pause, so
  this matters.

## Server work (live mode)

One module per resource, copying `src/modules/user` (schema, validation with zod, service,
controller, routes, `HttpError` for status codes):

`customers`, `payment-links`, `transactions`, `payouts` (+ `bank-accounts`), `activity`,
`support`, plus `settings` fields on the user.

- **Scoping**: every query filters by the owner, taken from the access token (`req.user.userId`).
- **Lists**: `?page=&limit=&search=&status=&type=&from=&to=` on every list endpoint, plus indexes on
  `{ owner, createdAt }`.
- **Stats**: `GET /stats/overview?from=&to=` returns totals and chart series in one call (a
  MongoDB aggregation).
- **Activity**: a small `logActivity(owner, action, entity)` helper called from services.
- **Atomic money moves**: payout plus debit transaction in one MongoDB transaction (Atlas supports
  it).

## Shared UI to build once

`src/lib/components/` (same style as `CustomInput` and `CustomSelect`):

| Component | Used by |
|---|---|
| `DataTable` (columns, sorting, pagination, empty state, loading rows) | every list page |
| `Modal` / `Drawer` | create and edit forms, transaction detail |
| `ConfirmDialog` | deletes, payouts (no `window.confirm`) |
| `AmountInput` + `formatMoney()` (NGN, kobo-safe integers) | links, payouts, transactions |
| `StatusBadge` | transactions, payouts, links, tickets |
| `FilterBar` (search, date range, select filters) | list pages |
| `StatCard`, `Chart` (Chart.js) | Overview |
| `EmptyState`, `Skeleton` | everywhere |
| `exportCsv()` | transactions, customers |

Store amounts as **integer kobo** in both backends to avoid rounding bugs.

## Phases (one PR each)

| # | Phase | Delivers | Size |
|---|---|---|---|
| 0 | Foundations | data layer interface, session mode, dashboard route guard, `formatMoney`, `DataTable`, `Modal`, `ConfirmDialog`, `StatusBadge`, `EmptyState` | M |
| 1 | Demo mode | `localSource`, seed generator, "Try the demo", banner, reset, login fallback; compliance works in demo | M |
| 2 | Customers | CRUD in both sources and on the server, search, CSV export | M |
| 3 | Payment links + transactions | link CRUD, simulate payment, transaction list, filters, detail drawer, refunds | L |
| 4 | Payouts | bank accounts, payout flow with balance check, payout history | M |
| 5 | Overview | stats endpoint and local version, chart, date range, top customers | M |
| 6 | Activity, settings, support | automatic activity log, profile edit (reuses `PATCH /user`), password change, notification prefs, support tickets | M |
| 7 | Polish | loading and error states, mobile layout pass, README with a demo walkthrough and screenshots | S |

Each phase lands working in **both** demo and live mode before the next one starts.

## Decisions (made 2026-10-25)

| Topic | Choice |
|---|---|
| Owner of new records | From the access token (`req.user.userId`); no `?userId=` on new endpoints |
| Charts | Chart.js (via `react-chartjs-2`) |
| Demo entry | "Try the demo" button on the login page, no password |
| Currency | NGN only, amounts stored as integer kobo |

## Fixed issues to keep in mind

- The access token is memory-only; `axios.ts` restores it from the refresh cookie before requests.
- `express.json()` rejects a `null` body; send `{}` for empty POSTs.
- `Content-Type: multipart/form-data` must be set by hand for uploads (the axios default is JSON).
- `GridFS` bucket `documents` holds uploaded compliance files.
