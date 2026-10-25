import { apiSource } from './apiSource';
import { localSource } from './localSource';
import type { DataSource } from './types';

export type SessionMode = 'live' | 'demo';

export const getDataSource = (mode: SessionMode): DataSource => (mode === 'demo' ? localSource : apiSource);

export * from './types';
