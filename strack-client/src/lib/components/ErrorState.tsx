import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../utils';

type Props = {
  message: string;
  onRetry?: () => void;
  /** 'banner' sits above content; 'panel' replaces content that failed to load. */
  variant?: 'banner' | 'panel';
  className?: string;
};

const ErrorState = ({ message, onRetry, variant = 'banner', className }: Props) =>
  variant === 'banner' ? (
    <div role="alert" className={cn('mt-4 flex items-center justify-between gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700', className)}>
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="shrink-0 font-medium underline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ) : (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-2 px-4 py-12 text-center', className)}>
      <AlertTriangle size={32} className="text-red-500" aria-hidden />
      <p className="text-sm font-medium text-gray-900">Something went wrong</p>
      <p className="max-w-sm text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button type="button" className="mt-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );

export default ErrorState;
