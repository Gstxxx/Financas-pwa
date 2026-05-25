'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDueDateNotifications } from '@/lib/hooks/useDueDateNotifications';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

/**
 * Mount-once helper bundle that owns the layout-level side effects:
 * the due-date scheduler (renderer side), global keyboard shortcuts, and
 * the listener for `nav:to` events pushed by the Electron main process
 * (fired when a background-scheduler toast is clicked). Doing routing here
 * — instead of in main — lets us use Next's client-side router.
 */
export function NotificationScheduler() {
  const router = useRouter();
  useDueDateNotifications();
  useKeyboardShortcuts();

  useEffect(() => {
    const desktop = typeof window !== 'undefined' ? window.electron?.desktop : null;
    if (!desktop?.onNavTo) return;
    return desktop.onNavTo((url) => {
      router.push(url);
    });
  }, [router]);

  return null;
}
