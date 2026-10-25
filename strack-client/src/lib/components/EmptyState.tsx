import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../utils';

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

const EmptyState = ({ title, description, icon, action, className }: Props) => (
  <div className={cn('flex flex-col items-center justify-center gap-2 px-4 py-12 text-center', className)}>
    <div className="text-gray-400">{icon ?? <Inbox size={32} aria-hidden />}</div>
    <p className="text-sm font-medium text-gray-900">{title}</p>
    {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
