import React from 'react';
import { Label } from '../../../@/components/ui/label';
import { Input } from '../../../@/components/ui/input';
import { Asterisk } from 'lucide-react';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  optional?: boolean;
  onChange?: (value: string) => void;
  error?: boolean;
  maxLength?: number;
  id?: string;
};

const CustomInput = ({
  type,
  label,
  value,
  placeholder,
  required,
  optional,
  error = false,
  onChange,
  maxLength,
  id,
}: Props) => {
  return (
    <div className="grid w-full items-center gap-2">
      {label && (
        <Label htmlFor={id ? id : type}>
          {label}{' '}
          {required ? (
            <Asterisk
              width="10px"
              height="10px"
              color="#FF3333"
              className="-ml-2 mb-1.5 inline-flex"
            />
          ) : optional ? (
            <Label className="text-[#525866] font-normal -ml-1.5">(Optional)</Label>
          ) : null}
        </Label>
      )}
      <Input
        type={type}
        id={id ? id : type}
        placeholder={placeholder}
        value={value}
        // required={required}
        size={10}
        maxLength={maxLength}
        onChange={(event) => onChange?.(event.target.value)}
        className={`text_input transition-all duration-200 ${
          error
            ? 'border border-[#FF3333] focus-visible:ring-0 focus-visible:border-[#FF3333]'
            : 'border border-[#E1E4EA] focus-visible:border-[#020C14]'
        }`}
      />
    </div>
  );
};

export default CustomInput;
