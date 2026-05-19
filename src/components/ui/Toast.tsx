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
        'fixed left-1/2 z-[200] transition-transform duration-300',
        'max-w-[90%] whitespace-nowrap overflow-hidden text-ellipsis'
      )}
      style={{
        top: 'max(16px, env(safe-area-inset-top))',
        background: 'color-mix(in oklch, var(--bg-elev) 92%, transparent)',
        border: '1px solid var(--hair)',
        color: 'var(--ink)',
        padding: '10px 18px',
        borderRadius: 99,
        fontSize: 13,
        fontWeight: 500,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, -130%)',
        transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
      }}
      role="status"
    >
      {message}
    </div>
  );
}
