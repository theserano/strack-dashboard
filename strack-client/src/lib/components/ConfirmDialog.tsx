'use client';
import React from 'react';
import Modal from './Modal';
import { cn } from '../utils';

type Props = {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) => (
  <Modal
    open={open}
    onClose={() => {
      if (!loading) onCancel();
    }}
    title={title}
    footer={
      <>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60',
            destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'
          )}
        >
          {loading ? 'Please wait...' : confirmLabel}
        </button>
      </>
    }
  >
    {message}
  </Modal>
);

export default ConfirmDialog;
