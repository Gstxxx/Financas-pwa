import { cn, type DebtStatusType, STATUS_LABELS } from '@/lib/utils';

const variantClass: Record<DebtStatusType, string> = {
  atrasado: 'pill-neg',
  breve: 'pill-warn',
  ok: 'pill-pos',
  pago: 'pill-pos',
};

interface StatusPillProps {
  status: DebtStatusType;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span className={cn('pill', variantClass[status], className)}>
      <span className="dot" />
      {STATUS_LABELS[status]}
    </span>
  );
}
