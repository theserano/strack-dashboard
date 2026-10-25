'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Asterisk, CalendarDays } from 'lucide-react';
import { Label } from '../../../../@/components/ui/label';
import { Input } from '../../../../@/components/ui/input';
import Calendar from './Calendar';
import { formatDate, isOutOfRange, maskDate, parseDate } from './utils';

type Props = {
  label?: string;
  /** DD/MM/YYYY string. Use toISODate() from './utils' before sending to the API. */
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  /** Forces the error style, e.g. after a failed submit. */
  error?: boolean;
  id?: string;
  minDate?: Date;
  maxDate?: Date;
  /** Month the calendar opens on when no date is set. */
  defaultMonth?: Date;
  /** Shown when the date is out of range. */
  rangeMessage?: string;
};

const CustomDateInput = ({
  label,
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  required,
  optional,
  error = false,
  id = 'date',
  minDate,
  maxDate,
  defaultMonth,
  rangeMessage = 'Please pick a date within the allowed range',
}: Props) => {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const parsed = parseDate(value);

  // Only nag once the user has left the field with something typed in.
  let message = '';
  if (touched && value) {
    if (!parsed) message = 'Enter a valid date as DD/MM/YYYY';
    else if (isOutOfRange(parsed, minDate, maxDate)) message = rangeMessage;
  }
  const showError = error || !!message;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative grid w-full items-center gap-2">
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
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          maxLength={10}
          aria-invalid={showError}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(e) => onChange?.(maskDate(e.target.value))}
          onBlur={() => setTouched(true)}
          className={`text_input pr-10 transition-all duration-200 ${
            showError
              ? 'border border-[#FF3333] focus-visible:ring-0 focus-visible:border-[#FF3333]'
              : 'border border-[#E1E4EA] focus-visible:border-[#020C14]'
          }`}
        />
        <button
          type="button"
          aria-label="Open calendar"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#525866] hover:bg-[#F5F7FA]"
        >
          <CalendarDays size={18} />
        </button>
      </div>

      {message && (
        <p id={`${id}-error`} className="text-xs text-[#FF3333]">
          {message}
        </p>
      )}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2">
          <Calendar
            selected={parsed}
            minDate={minDate}
            maxDate={maxDate}
            defaultMonth={defaultMonth}
            onSelect={(date) => {
              onChange?.(formatDate(date));
              setTouched(true);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CustomDateInput;
