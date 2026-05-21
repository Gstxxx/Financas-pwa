'use client';

import { useEffect, useState } from 'react';

export function TitleBar() {
  const [available, setAvailable] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window.electron?.window;
    if (!w) return;
    setAvailable(true);
    w.isMaximized().then(setMaximized).catch(() => {});
    const unsub = w.onMaximizedChange(setMaximized);
    return unsub;
  }, []);

  if (!available) return null;

  const w = window.electron!.window;

  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <span className="live-dot" />
        <span className="titlebar-title">Financas</span>
      </div>

      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn"
          onClick={() => w.minimize()}
          aria-label="Minimizar"
          title="Minimizar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          type="button"
          className="titlebar-btn"
          onClick={() => w.toggleMaximize()}
          aria-label={maximized ? 'Restaurar' : 'Maximizar'}
          title={maximized ? 'Restaurar' : 'Maximizar'}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="none">
              <rect x="0.5" y="2.5" width="7" height="7" stroke="currentColor" />
              <path d="M2.5 2.5V0.5h7v7H7.5" stroke="currentColor" fill="none" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="titlebar-btn titlebar-close"
          onClick={() => w.close()}
          aria-label="Fechar"
          title="Fechar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
