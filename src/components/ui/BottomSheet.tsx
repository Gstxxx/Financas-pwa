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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
        {title && (
          <h3 className="font-display text-[22px] font-semibold mb-3.5 tracking-tight">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
