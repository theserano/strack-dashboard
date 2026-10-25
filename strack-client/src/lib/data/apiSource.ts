import api from '@/lib/utils/axios';
import type { DataSource, Id, ListParams, ListResult } from './types';

// Server responses are shaped `{ data: ... }` (see user thunks).
const unwrap = async <T>(req: Promise<{ data: { data: T } }>): Promise<T> => (await req).data.data;

const list = <T>(path: string, params?: ListParams) =>
  unwrap<ListResult<T>>(api.get(path, { params }));
const get = <T>(path: string, id: Id) => unwrap<T>(api.get(`${path}/${id}`));
const create = <T>(path: string, body: unknown) => unwrap<T>(api.post(path, body));
const update = <T>(path: string, id: Id, body: unknown) => unwrap<T>(api.patch(`${path}/${id}`, body));
const remove = async (path: string, id: Id) => {
  await api.delete(`${path}/${id}`);
};

const resource = <T, C = unknown, U = unknown>(path: string) => ({
  list: (params?: ListParams) => list<T>(path, params),
  get: (id: Id) => get<T>(path, id),
  create: (input: C) => create<T>(path, input),
  update: (id: Id, input: U) => update<T>(path, id, input),
  remove: (id: Id) => remove(path, id),
});

export const apiSource: DataSource = {
  customers: resource('/customers'),
  paymentLinks: resource('/payment-links'),
  transactions: {
    list: (p) => list('/transactions', p),
    get: (id) => get('/transactions', id),
  },
  payouts: {
    list: (p) => list('/payouts', p),
    get: (id) => get('/payouts', id),
    create: (input) => create('/payouts', input),
  },
  bankAccounts: resource('/bank-accounts'),
  activity: { list: (p) => list('/activity', p) },
  support: {
    list: (p) => list('/support', p),
    get: (id) => get('/support', id),
    create: (input) => create('/support', input),
    reply: (id, message) => create(`/support/${id}/replies`, { message }),
    close: (id) => create(`/support/${id}/close`, {}), // express.json() rejects a null body
  },
  settings: {
    get: () => unwrap(api.get('/settings')),
    update: (input) => unwrap(api.patch('/settings', input)),
  },
};
