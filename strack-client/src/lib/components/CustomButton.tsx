import React, { ReactElement } from 'react';
import { Button } from '../../../@/components/ui/button';
import { Loader2 } from 'lucide-react';

type Props = {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactElement;
  className?: string;
  type?: 'submit' | 'button' | 'reset' | undefined;
  isLoading?: boolean;
  /** Stretch to the container width (auth and compliance forms). Defaults to fitting the text. */
  fullWidth?: boolean;
};

const CustomButton = ({
  text,
  onClick,
  disabled,
  icon,
  className,
  type = 'button',
  isLoading,
  fullWidth = false,
}: Props) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? "w-full" : "w-auto shrink-0 whitespace-nowrap px-5"} h-12 ${disabled ? 'bg-[#E1E4EA] text-[#667185]' : 'bg-[#020C14] text-[#fff]'} text-[16px] rounded-lg disabled:cursor-not-allowed ${className}`}
      type={type}
    >
      {isLoading ? <Loader2 className="animate-spin" /> : icon ? icon : null}
      {text}
    </Button>
  );
};

export default CustomButton;
