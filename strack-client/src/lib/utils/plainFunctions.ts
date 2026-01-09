import { ReactNode } from 'react';
import { toast } from 'sonner';

export const showToast = ({
  message,
  description,
  onAutoClose,
  icon,
}: {
  message: string;
  description: string;
  onAutoClose?: (() => void) | undefined;
  icon?: ReactNode;
}) => {
  toast(message, {
    description,
    closeButton: true,
    onAutoClose: onAutoClose,
    duration: 4000,
    icon: icon,
    position: 'top-center',
    descriptionClassName: '!text-[#99A0AE]',
  });
};

export const truncateText = ({
  text,
  length = 35,
  readMore = '...',
}: {
  text: string;
  length?: number;
  readMore?: string;
  }) => {
  return `${text?.substring(0, length).trim()}${text?.length <= length ? '' : readMore}`;
};
