'use client';

import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  isVisible: boolean;
}

export function Toast({ message, isVisible }: ToastProps) {
  return (
    <div
      className={cn(
        'fixed top-[max(16px,env(safe-area-inset-top))] left-1/2 z-[200]',
        'bg-surface-2 border border-border-strong text-text',
        'px-4 py-2.5 rounded-full text-[13px] font-medium',
        'shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
        'max-w-[90%] whitespace-nowrap overflow-hidden text-ellipsis',
        'transition-transform duration-300',
        isVisible
          ? 'translate-x-[-50%] translate-y-0'
          : 'translate-x-[-50%] translate-y-[-130%]'
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)' }}
      role="status"
    >
      {message}
    </div>
  );
}
