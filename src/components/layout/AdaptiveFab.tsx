'use client';

import { usePathname } from 'next/navigation';
import { I } from '@/components/icons/I';

interface FabAction {
  label: string;
  onClick: () => void;
}

interface AdaptiveFabProps {
  onAction: () => void;
  secondaryAction?: FabAction;
}

const FAB_CONFIG: Record<string, { label: string }> = {
  '/home': { label: 'Adicionar conta' },
  '/debts': { label: 'Nova conta' },
  '/entities': { label: 'Nova categoria' },
  '/goals': { label: 'Nova meta' },
};

export function AdaptiveFab({ onAction, secondaryAction }: AdaptiveFabProps) {
  const pathname = usePathname();
  const normalized = pathname && pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  const config = normalized ? FAB_CONFIG[normalized] : undefined;

  if (!config) return null;

  const showSecondary = !!secondaryAction && normalized === '/home';

  return (
    <div className="fab-row">
      <button type="button" className="fab fab-light" onClick={onAction} aria-label={config.label}>
        <I.plus size={14} stroke={2} />
        {config.label}
      </button>
      {showSecondary && (
        <button
          type="button"
          className="fab fab-accent"
          onClick={secondaryAction!.onClick}
          aria-label={secondaryAction!.label}
        >
          <I.arrowUp size={14} stroke={2} />
          {secondaryAction!.label}
        </button>
      )}
    </div>
  );
}
