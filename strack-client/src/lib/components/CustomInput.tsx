import React from 'react';
import { Label } from '../../../@/components/ui/label';
import { Input } from '../../../@/components/ui/input';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: {
    status: boolean;
    text: string;
  };
};

const CustomInput = ({ type, label, value, placeholder, required, error }: Props) => {
  return (
    <div className="grid w-full max-w-sm items-center gap-3">
      {label && <Label htmlFor={type}>{label}</Label>}
      <Input type={type} id={type} placeholder={placeholder} value={value} required={required} />
      {error && error?.status && <p className="text-[10px] text-red-400 -mb-2">{error?.text}</p>}
    </div>
  );
};

export default CustomInput;
