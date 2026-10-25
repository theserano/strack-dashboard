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
  paymentLinks: {
    ...resource('/payment-links'),
    simulatePayment: (id, input) => create(`/payment-links/${id}/payments`, input ?? {}),
  },
  transactions: {
    list: (p) => list('/transactions', p),
    get: (id) => get('/transactions', id),
    updateStatus: (id, status) => update('/transactions', id, { status }),
    addNote: (id, note) => update('/transactions', id, { note }),
    refund: (id) => create(`/transactions/${id}/refund`, {}),
  },
  user: {
    get: (userId) => unwrap(api.get('/user', { params: { userId } })),
    update: (data, userId) => unwrap(api.patch('/user', data, { params: { userId } })),
    uploadDocuments: (files, userId) => {
      const formData = new FormData();
      Object.entries(files).forEach(([type, file]) => file && formData.append(type, file));
      // The axios instance defaults to JSON, which would turn FormData into JSON.
      return unwrap(
        api.post('/user/documents', formData, {
          params: { userId },
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        })
      );
    },
    submitCompliance: (userId) => unwrap(api.post('/user/compliance/submit', {}, { params: { userId } })),
  },
  stats: { overview: (params) => unwrap(api.get('/stats/overview', { params })) },
  reset: async () => {
    throw new Error('reset() is only available in demo mode');
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
