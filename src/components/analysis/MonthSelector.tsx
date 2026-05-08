'use client';

import { fmtMonthYear } from '@/lib/utils';

interface MonthSelectorProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export function MonthSelector({ month, year, onChange }: MonthSelectorProps) {
  const prev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };

  const next = () => {
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };

  return (
    <div className="flex items-center justify-between bg-surface border border-border rounded-[18px] px-4 py-3">
      <button
        className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-text-2 transition-colors active:bg-surface-2"
        onClick={prev}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="font-display text-base font-semibold">
        {fmtMonthYear(month, year)}
      </span>
      <button
        className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-text-2 transition-colors active:bg-surface-2"
        onClick={next}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
