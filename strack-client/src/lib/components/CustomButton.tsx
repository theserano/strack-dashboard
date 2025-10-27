import React from 'react';
import { Button } from '../../../@/components/ui/button';

type Props = {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
};

const CustomButton = ({ text, onClick, disabled }: Props) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 ${disabled ? 'bg-[#E1E4EA] text-[#667185]' : 'bg-[#020C14] text-[#fff]'} text-[16px] rounded-lg disabled:cursor-not-allowed`}
    >
      {text}
    </Button>
  );
};

export default CustomButton;
