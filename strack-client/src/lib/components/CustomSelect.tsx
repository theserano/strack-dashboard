import React from 'react';
import { Label } from '../../../@/components/ui/label';
import { Asterisk, ChevronDown } from 'lucide-react';

export type SelectOption = { label: string; value: string };

type Props = {
  label?: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  onChange?: (value: string) => void;
  error?: boolean;
  id: string;
  disabled?: boolean;
};

// Native <select> so it's keyboard- and screen-reader-friendly and uses the phone's picker on mobile.
const CustomSelect = ({
  label,
  value,
  options,
  placeholder = 'Select an option',
  required,
  optional,
  onChange,
  error = false,
  id,
  disabled,
}: Props) => {
  return (
    <div className="grid w-full items-center gap-2">
      {label && (
        <Label htmlFor={id}>
          {label}{' '}
          {required ? (
            <Asterisk width="10px" height="10px" color="#FF3333" className="-ml-2 mb-1.5 inline-flex" />
          ) : optional ? (
            <span className="text-[#525866] font-normal -ml-1.5">(Optional)</span>
          ) : null}
        </Label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-invalid={error}
          onChange={(e) => onChange?.(e.target.value)}
          className={`text_input h-9 w-full appearance-none rounded-md bg-transparent pl-3 pr-9 text-base md:text-sm outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            value ? 'text-[#0E121B]' : 'text-[#99A0AE]'
          } ${
            error
              ? 'border border-[#FF3333] focus-visible:border-[#FF3333]'
              : 'border border-[#E1E4EA] focus-visible:border-[#020C14]'
          }`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-[#0E121B]">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#525866]"
        />
      </div>
    </div>
  );
};

export default CustomSelect;
