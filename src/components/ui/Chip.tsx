'use client';

import { cn } from '@/lib/utils';

interface ChipProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

/** Standalone chip — for inline filters, prefer Seg. */
export function Chip({ label, count, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      className={cn('btn', active ? 'btn-primary' : 'btn-ghost')}
      style={{ height: 36, padding: '0 16px', fontSize: 12.5, fontWeight: 500 }}
      onClick={onClick}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10.5,
            opacity: active ? 0.75 : 0.55,
            marginLeft: 4,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
