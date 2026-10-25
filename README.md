# Strack

Strack is a payments dashboard for small businesses: create payment links, collect (simulated) payments,
track customers and transactions, refund, and pay out to a bank account. It ships with a **demo mode**
that runs entirely in the browser, so the app works even when the API or MongoDB is asleep.

No real money moves. Payments are simulated and payouts settle instantly in the app.

## Try the demo

1. Open the login page and click **Try the demo** (no password).
2. **Overview**: balance, revenue chart (day / week / month), top customers, recent transactions.
3. Go to **Payment links**, pick an active link and choose **Simulate payment**.
4. Open **Transactions** to see the new credit; the Overview totals and chart have moved too.
5. Open that transaction and **Refund** it. A refund debit is created and net revenue drops.
6. Open **Payouts**, request a payout to a saved bank account (fee, min and max are enforced).
7. Open **Activity log** to see every action above recorded.
8. In **Settings** (or the demo banner) choose **Reset demo data** to restore the sample data.

The Overview's Quick Actions jump straight to these flows (for example `/dashboard/payment?simulate=1`).

## Features

- Overview: stats, revenue chart, top customers, recent transactions, quick actions
- Customers: CRUD, search, CSV export, per-customer payment history
- Payment links: fixed or open amount, enable / disable, simulate payments
- Transactions: filters, detail drawer, notes, status changes, refunds, CSV export
- Payouts and bank accounts: balance check, fee, default account, history
- Activity log: written automatically for every create / update / delete
- Settings: profile, password change, notification preferences
- Support tickets with replies
- Compliance: multi-step verification with document uploads
- Loading skeletons, error panels with Retry, and empty states with a call to action on every page
- Responsive layout: the sidebar becomes a slide-in drawer below 640px

## Architecture

Pages never call the API directly. They call a **data source** that has one interface and two backends:

```
page -> hook / redux thunk -> dataSource.customers.create(...)
                                 |-- apiSource    -> Express -> MongoDB    (real users)
                                 '-- localSource  -> localStorage          (demo user)
```

- `strack-client/src/lib/data/types.ts`: shared types and the `DataSource` interface
- `strack-client/src/lib/data/apiSource.ts`: calls the server
- `strack-client/src/lib/data/localSource.ts` + `seed.ts`: demo backend (localStorage, IndexedDB for files)
- `strack-client/src/lib/data/index.ts`: `getDataSource(mode)` picks one from `state.auth.mode` (`'live' | 'demo'`)

Every feature is built once and works in both modes. The server has one module per resource under
`strack-server/src/modules/*` (schema, zod validation, service, controller, routes).

More detail and the phase history are in [docs/dashboard-plan.md](docs/dashboard-plan.md).

## Tech stack

- Client: Next.js (app router), React, TypeScript, Redux Toolkit, Tailwind CSS, shadcn/ui, Chart.js, Vitest
- Server: Node, Express 5, TypeScript, Mongoose / MongoDB, zod, JWT (access token in memory, refresh cookie), bcrypt, express-rate-limit

## Local setup

Requirements: Node 20+, and for live mode a MongoDB replica set (see Deploy notes).

Server (`strack-server`):

```
cd strack-server
npm install
# create .env with the variables below
npm run dev        # nodemon + ts-node
npx tsc --noEmit   # type check (there is no server test suite yet)
```

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | signs access tokens |
| `REFRESH_TOKEN_SECRET` | signs refresh tokens |
| `CLIENT_ORIGIN` | allowed CORS origin of the client |
| `PORT` | listen port (default 3000) |
| `NODE_ENV` | `production` enables production behaviour (for example secure cookies) |

Client (`strack-client`):

```
cd strack-client
npm install
# .env.local: NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/strack-api
npm run dev
```

Demo mode needs no server or environment variables.

## Deploy notes

- MongoDB must be a **replica set** (Atlas works). Balance-changing writes (refunds, payouts) run in
  transactions guarded by a per-owner lock; a standalone `mongod` will fail.
- MongoDB **5.0 or newer** (the stats endpoint uses `$dateTrunc`).
- The server sets `trust proxy` to 1 so rate limits see the real client IP behind one proxy (Render, etc.).
- Rate limiting is **in-memory**: limits are per process, so use a shared store if you run several instances.
- Free tiers sleep (Render) or pause (Atlas); the login page offers the demo when the server is unreachable.
- Set `CLIENT_ORIGIN` to the deployed client URL and `NEXT_PUBLIC_API_BASE_URL` to the deployed API.

## Money rules

- Amounts are integer **kobo** end to end (NGN only); formatting happens in `src/lib/utils/money.ts`.
- Balance = successful credits minus successful debits (refunds and payout debits are debits).
- Payouts are simulated: no payment rail, they settle immediately. Fee ₦50 per payout, minimum ₦100, maximum ₦10,000,000.
- A refund creates a debit linked to the original credit; a payment can be refunded once.
- Net revenue excludes credits that have been refunded.

## Testing

```
cd strack-client
npx vitest run     # 142 tests in 13 files (data layer, money, stats, validation, sources)
npx tsc --noEmit
npm run lint
npm run build
```

## Screenshots

TODO: add images under `docs/screenshots/` and link them here.

- Overview: `docs/screenshots/overview.png`
- Payment links: `docs/screenshots/payment-links.png`
- Transactions: `docs/screenshots/transactions.png`
- Payouts: `docs/screenshots/payouts.png`
- Mobile: `docs/screenshots/mobile.png`
