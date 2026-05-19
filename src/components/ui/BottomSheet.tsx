'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { I } from '@/components/icons/I';

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
    if (!isOpen) return;
    document.addEventListener('keydown', handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, handleEscape]);

  return (
    <>
      <div
        className={cn('sheet-overlay', isOpen && 'open')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn('sheet', isOpen && 'open')}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        <div className="sheet-grabber" />
        <div className="sheet-head">
          {title ? (
            <h2 className="t-h2" style={{ flex: 1, minWidth: 0 }}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="sheet-close"
          >
            <I.close size={14} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
