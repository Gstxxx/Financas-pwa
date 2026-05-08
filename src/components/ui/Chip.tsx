import { cn } from '@/lib/utils';

interface ChipProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

export function Chip({ label, count, active, onClick }: ChipProps) {
  return (
    <button
      className={cn(
        'flex-shrink-0 px-3.5 py-2 rounded-full border text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap',
        'inline-flex items-center gap-1.5',
        active
          ? 'bg-text text-bg border-text'
          : 'bg-surface border-border text-text-2'
      )}
      onClick={onClick}
    >
      {label}
      {count !== undefined && (
        <span className={cn('text-[11px] tabular-nums', active ? 'opacity-60' : 'opacity-70')}>
          {count}
        </span>
      )}
    </button>
  );
}
