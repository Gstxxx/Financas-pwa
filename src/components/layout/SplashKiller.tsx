'use client';

import { useEffect } from 'react';

/**
 * Removes the boot splash (#app-splash) once React has mounted. Sits at
 * the very top of the body so it runs regardless of which page/state the
 * app lands on. A 400 ms minimum keeps the splash from flashing on fast
 * machines — long enough to register, short enough not to annoy.
 */
export function SplashKiller() {
  useEffect(() => {
    const el = document.getElementById('app-splash');
    if (!el) return;
    const fadeTimer = window.setTimeout(() => {
      el.classList.add('fade-out');
      const removeTimer = window.setTimeout(() => {
        el.remove();
      }, 500);
      // Stash so we can clean up in StrictMode.
      (el as HTMLElement).dataset.removeTimer = String(removeTimer);
    }, 400);
    return () => {
      window.clearTimeout(fadeTimer);
      const id = Number((el as HTMLElement).dataset.removeTimer);
      if (id) window.clearTimeout(id);
    };
  }, []);

  return null;
}
