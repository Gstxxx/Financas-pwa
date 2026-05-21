'use client';

import { useDueDateNotifications } from '@/lib/hooks/useDueDateNotifications';

/**
 * Mount-once helper that runs the due-date webhook scheduler. Lives at the
 * layout level so it stays alive across route changes.
 */
export function NotificationScheduler() {
  useDueDateNotifications();
  return null;
}
