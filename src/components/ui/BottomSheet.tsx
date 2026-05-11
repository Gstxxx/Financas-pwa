'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end justify-center transition-opacity duration-250',
        'bg-black/70 backdrop-blur-[8px]',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      <div
        className={cn(
          'bg-surface border-t border-border-strong rounded-t-lg w-full max-w-[480px] max-h-[92vh] overflow-y-auto transition-transform duration-300',
          'px-5 pt-[18px] pb-[max(24px,env(safe-area-inset-bottom))]',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-9 h-1 rounded-sm bg-border-strong mx-auto mb-4" />
        <div className="flex items-start justify-between gap-3 mb-3.5">
          {title ? (
            <h3 className="font-display text-[22px] font-semibold tracking-tight flex-1 min-w-0 break-words">
              {title}
            </h3>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 -mt-1 -mr-1 w-9 h-9 rounded-full flex items-center justify-center text-text-2 hover:text-text hover:bg-white/[0.06] active:scale-95 transition-colors text-xl leading-none"
          >
            &#x2715;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
