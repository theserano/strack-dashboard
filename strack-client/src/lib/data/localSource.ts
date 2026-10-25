import type { DataSource } from './types';

const notReady = (): never => {
  throw new Error('Demo mode arrives in Phase 1');
};

// Every method throws until Phase 1 fills it. Proxies keep this stub free of boilerplate.
const stubNamespace = () =>
  new Proxy({}, { get: () => () => notReady() }) as never;

export const localSource: DataSource = {
  customers: stubNamespace(),
  paymentLinks: stubNamespace(),
  transactions: stubNamespace(),
  payouts: stubNamespace(),
  bankAccounts: stubNamespace(),
  activity: stubNamespace(),
  support: stubNamespace(),
  user: stubNamespace(),
  settings: stubNamespace(),
  reset: async () => notReady(),
};
