'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FabAction {
  label: string;
  onClick: () => void;
}

interface AdaptiveFabProps {
  onAction: () => void;
  secondaryAction?: FabAction;
}

const FAB_CONFIG: Record<string, { label: string; show: boolean }> = {
  '/home': { label: 'Adicionar conta', show: true },
  '/debts': { label: 'Nova conta', show: true },
  '/entities': { label: 'Nova categoria', show: true },
  '/goals': { label: 'Nova meta', show: true },
};

export function AdaptiveFab({ onAction, secondaryAction }: AdaptiveFabProps) {
  const pathname = usePathname();
  const normalized = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  const config = FAB_CONFIG[normalized];

  if (!config?.show) return null;

  const showSecondary = !!secondaryAction && normalized === '/home';

  return (
    <div
      className={cn(
        'fixed bottom-[max(76px,calc(56px+env(safe-area-inset-bottom)+16px))] left-1/2 -translate-x-1/2 z-10',
        'flex items-center gap-2'
      )}
    >
      <button
        className={cn(
          'bg-text text-bg border-none rounded-full px-5 py-3.5',
          'font-display text-sm font-semibold tracking-tight',
          'inline-flex items-center gap-[7px] cursor-pointer',
          'shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]',
          'transition-transform active:scale-95'
        )}
        onClick={onAction}
        aria-label={config.label}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {config.label}
      </button>
      {showSecondary && (
        <button
          className={cn(
            'bg-income/15 text-income border border-income/40 rounded-full px-4 py-3.5',
            'font-display text-sm font-semibold tracking-tight',
            'inline-flex items-center gap-[6px] cursor-pointer',
            'shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur',
            'transition-transform active:scale-95'
          )}
          onClick={secondaryAction!.onClick}
          aria-label={secondaryAction!.label}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          {secondaryAction!.label}
        </button>
      )}
    </div>
  );
}
