import React, { ReactElement } from 'react';
import { Button } from '../../../@/components/ui/button';
import { LucideProps } from 'lucide-react';

type Props = {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactElement;
  className?: string;
  type?: 'submit' | 'button' | 'reset' | undefined;
};

const CustomButton = ({ text, onClick, disabled, icon, className, type = 'button' }: Props) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 ${disabled ? 'bg-[#E1E4EA] text-[#667185]' : 'bg-[#020C14] text-[#fff]'} text-[16px] rounded-lg disabled:cursor-not-allowed ${className}`}
      type={type}
    >
      {icon && icon}
      {text}
    </Button>
  );
};

export default CustomButton;
