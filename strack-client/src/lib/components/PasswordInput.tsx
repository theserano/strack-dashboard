import React, { useEffect, useState } from 'react';
import { Label } from '@radix-ui/react-label';
import { Input } from '../../../@/components/ui/input';
import { Asterisk, Check, Eye, EyeOff } from 'lucide-react';

type Props = {
  label?: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  hasError?: (value: boolean) => void;
  error?: boolean;
  noCheck?: boolean;
};

const PasswordInput = ({
  label,
  value,
  placeholder,
  required,
  onChange,
  error,
  noCheck = false,
}: Props) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasUpperCase, setHasUpperCase] = useState<string>('');
  const [hasLowerCase, setHasLowerCase] = useState<string>('');
  const [hasNumber, setHasNumber] = useState<string>('');
  const [hasSymbol, setHasSymbol] = useState<string>('');

  const checkIfPasswordIsNotValid = (value: string) => {
    const greyColor = '#667185';
    const greenColor = '#2CA11D';
    const redColor = '#FF3333';

    if (!value) {
      setHasUpperCase(greyColor);
      setHasLowerCase(greyColor);
      setHasNumber(greyColor);
      setHasSymbol(greyColor);
      return;
    }

    const hasUpperCaseLetter = /[A-Z]/.test(value);
    const hasLowerCaseLetter = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    //   check if password has upper case
    if (hasUpperCaseLetter) {
      setHasUpperCase(greenColor);
    } else {
      setHasUpperCase(redColor);
    }

    //   check if password has lower case
    if (hasLowerCaseLetter) {
      setHasLowerCase(greenColor);
    } else {
      setHasLowerCase(greyColor);
    }

    //   check if password has numbers
    if (hasNumber) {
      setHasNumber(greenColor);
    } else {
      setHasNumber(greyColor);
    }

    // check if password has symbol
    if (hasSymbol) {
      setHasSymbol(greenColor);
    } else {
      setHasSymbol(greyColor);
    }
  };

  useEffect(() => {
    if (noCheck) return;
    checkIfPasswordIsNotValid(value);
  }, [value]);

  return (
    <div className="grid w-full items-center gap-2 relative">
      {label && (
        <Label htmlFor="password">
          {label}
          {required && (
            <Asterisk width="10px" height="10px" color="#FF3333" className="mb-2 inline-flex" />
          )}
        </Label>
      )}

      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          id="password"
          placeholder={placeholder}
          value={value}
          size={10}
          onChange={(event) => onChange?.(event.target.value)}
          className={`text_input pr-10 transition-all duration-200 ${
            error
              ? 'border border-[#FF3333] focus-visible:ring-0 focus-visible:border-[#FF3333]'
              : 'border border-[#E1E4EA] focus-visible:border-[#020C14]'
          }`}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className={`absolute right-3 ${noCheck ? 'top-1/2' : 'top-1/3'} -translate-y-1/2 text-[#667185] hover:text-gray-600 focus:outline-none`}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        {noCheck ? null : (
          <div className="flex gap-4 items-center flex-wrap mt-1 ml-1">
            <div className="text-[12px] flex gap-0.5 items-center" style={{ color: hasUpperCase }}>
              <Check width={`12px`} height={`12px`} strokeWidth={`4px`} />
              <p>Uppercase</p>
            </div>
            <div className="text-[12px] flex gap-0.5 items-center" style={{ color: hasLowerCase }}>
              <Check width={`12px`} height={`12px`} strokeWidth={`4px`} />
              <p>Lowercase</p>
            </div>
            <div className="text-[12px] flex gap-0.5 items-center" style={{ color: hasNumber }}>
              <Check width={`12px`} height={`12px`} strokeWidth={`4px`} />
              <p>Number</p>
            </div>
            <div className="text-[12px] flex gap-0.5 items-center" style={{ color: hasSymbol }}>
              <Check width={`12px`} height={`12px`} strokeWidth={`4px`} />
              <p>Symbol</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordInput;
