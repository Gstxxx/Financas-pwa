'use client';

import { getGreeting } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function Header({ title = 'Suas financas', subtitle, rightAction }: HeaderProps) {
  const greeting = subtitle || getGreeting();

  return (
    <header className="flex justify-between items-center py-3.5 pb-2">
      <div>
        <div className="font-display text-xs font-medium text-text-3 tracking-[0.12em] uppercase">
          {greeting}
        </div>
        <div className="font-display text-[22px] font-semibold mt-1 tracking-tight">
          {title}
        </div>
      </div>
      {rightAction}
    </header>
  );
}
