'use client';

import { cn } from '@/lib/utils';

export interface SegOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  fullWidth?: boolean;
  className?: string;
}

export function Seg<T extends string>({
  value,
  onChange,
  options,
  fullWidth,
  className,
}: SegProps<T>) {
  return (
    <div className={cn('seg', fullWidth && 'seg-full', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? 'on' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {opt.count !== undefined && <span className="count">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}
