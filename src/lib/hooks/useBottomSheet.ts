'use client';

import { useState, useCallback } from 'react';

export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);

  const open = useCallback((contentId?: string) => {
    if (contentId) setContent(contentId);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = '';
    setTimeout(() => setContent(null), 300);
  }, []);

  return { isOpen, content, open, close };
}
