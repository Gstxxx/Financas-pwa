'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts. Mounted once at the layout level so they work
 * regardless of the current route. Shortcuts only fire when the user isn't
 * typing into a form field, so a Ctrl+N from inside an Input still inserts
 * a newline / control char instead of opening the debt form.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handler(e: KeyboardEvent) {
      // Don't fight the OS / browser combos.
      if (e.altKey || e.metaKey) return;
      if (!e.ctrlKey) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();

      // Number row: page navigation.
      const NAV: Record<string, string> = {
        '1': '/home/',
        '2': '/debts/',
        '3': '/entities/',
        '4': '/goals/',
        '5': '/analysis/',
        '6': '/stats/',
        '7': '/profile/',
      };
      if (NAV[key]) {
        e.preventDefault();
        router.push(NAV[key]);
        return;
      }

      // Letter shortcuts.
      switch (key) {
        case 'n':
          e.preventDefault();
          router.push('/debts/?new=1');
          return;
        case 'g':
          e.preventDefault();
          router.push('/goals/?new=1');
          return;
        case 'i':
          e.preventDefault();
          router.push('/home/?income=1');
          return;
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [router]);
}
