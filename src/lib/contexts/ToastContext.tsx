'use client';

import React, { createContext, useContext } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

interface ToastContextValue {
  toast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { message, isVisible, show } = useToast();

  return (
    <ToastContext.Provider value={{ toast: show }}>
      {children}
      <Toast message={message} isVisible={isVisible} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  return useContext(ToastContext);
}
