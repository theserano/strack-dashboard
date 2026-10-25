import React from 'react';
import { cn } from '../utils';

export type Status = 'successful' | 'pending' | 'failed' | 'active' | 'disabled' | 'open' | 'closed';

const styles: Record<Status, string> = {
  successful: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  open: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  disabled: 'bg-gray-100 text-gray-700',
  closed: 'bg-gray-100 text-gray-700',
};

const StatusBadge = ({ status, className }: { status: Status; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
      styles[status],
      className
    )}
  >
    {status}
  </span>
);

export default StatusBadge;
