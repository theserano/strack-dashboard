import React, { ReactElement } from 'react';
import { Button } from '../../../@/components/ui/button';
import { LucideProps } from 'lucide-react';

type Props = {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactElement;
};

const CustomButton = ({ text, onClick, disabled, icon }: Props) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 ${disabled ? 'bg-[#E1E4EA] text-[#667185]' : 'bg-[#020C14] text-[#fff]'} text-[16px] rounded-lg disabled:cursor-not-allowed`}
    >
      {icon && icon}
      {text}
    </Button>
  );
};

export default CustomButton;
