'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * Watches `?flag=1` in the current URL and fires `onSet` once each time it
 * appears, then strips the param so a reload doesn't re-trigger. Used by
 * keyboard shortcuts and notification-toast clicks to ask a page to open
 * a specific form without changing the page's primary state.
 */
export function useQueryFlag(flag: string, onSet: () => void): void {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (params.get(flag) !== '1') return;
    onSet();
    const next = new URLSearchParams(params.toString());
    next.delete(flag);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // We intentionally don't depend on `onSet` to avoid loops if the caller
    // creates a fresh callback every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, flag, pathname, router]);
}
