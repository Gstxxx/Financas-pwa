import { cn } from '@/lib/utils';
import { DebtStatusType, STATUS_LABELS } from '@/lib/utils';

const statusStyles: Record<DebtStatusType, { bg: string; text: string; dot: string }> = {
  atrasado: { bg: 'bg-critical-bg', text: 'text-[#fca5a5]', dot: 'bg-critical' },
  breve: { bg: 'bg-warn-bg', text: 'text-warn', dot: 'bg-warn' },
  ok: { bg: 'bg-income-bg', text: 'text-income', dot: 'bg-income' },
  pago: { bg: 'bg-income-bg', text: 'text-income', dot: 'bg-income' },
};

interface StatusPillProps {
  status: DebtStatusType;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const styles = statusStyles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] text-[11px] font-medium px-2.5 py-1 rounded-full tracking-wide',
        styles.bg,
        styles.text,
        className
      )}
    >
      <span className={cn('w-[5px] h-[5px] rounded-full', styles.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}
