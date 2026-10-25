'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS, isOutOfRange, isSameDay, startOfDay } from './utils';

type Props = {
  selected: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  /** Month shown when nothing is selected yet. */
  defaultMonth?: Date;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const Calendar = ({ selected, onSelect, minDate, maxDate, defaultMonth }: Props) => {
  const initial = selected ?? defaultMonth ?? maxDate ?? new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const today = startOfDay(new Date());

  const minYear = minDate?.getFullYear() ?? today.getFullYear() - 100;
  const maxYear = maxDate?.getFullYear() ?? today.getFullYear() + 10;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const shiftMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.year, view.month, i + 1)),
  ];

  const canGoBack = !minDate || new Date(view.year, view.month, 0) >= startOfDay(minDate);
  const canGoForward = !maxDate || new Date(view.year, view.month + 1, 1) <= startOfDay(maxDate);

  const selectClass =
    'rounded-md border border-[#E1E4EA] bg-white px-2 py-1 text-sm text-[#0E121B] focus:outline-none focus:border-[#020C14]';
  const navClass =
    'flex h-8 w-8 items-center justify-center rounded-md text-[#525866] hover:bg-[#F5F7FA] disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div className="w-[300px] rounded-xl border border-[#E1E4EA] bg-white p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" className={navClass} disabled={!canGoBack} onClick={() => shiftMonth(-1)}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-2">
          <select
            aria-label="Month"
            className={selectClass}
            value={view.month}
            onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m.slice(0, 3)}</option>
            ))}
          </select>
          <select
            aria-label="Year"
            className={selectClass}
            value={view.year}
            onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button type="button" aria-label="Next month" className={navClass} disabled={!canGoForward} onClick={() => shiftMonth(1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-xs font-medium text-[#99A0AE]">{d}</span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const disabled = isOutOfRange(date, minDate, maxDate);
          const isSelected = !!selected && isSameDay(date, selected);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={date.getDate()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              className={`h-9 rounded-md text-sm transition-colors disabled:text-[#CACFD8] disabled:pointer-events-none ${
                isSelected
                  ? 'bg-[#020C14] text-white'
                  : `text-[#0E121B] hover:bg-[#F5F7FA] ${isToday ? 'border border-[#E1E4EA] font-semibold' : ''}`
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
