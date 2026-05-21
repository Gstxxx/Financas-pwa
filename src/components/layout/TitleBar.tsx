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
        <span className="titlebar-icon" aria-hidden>
          <svg viewBox="0 0 512 512" width="16" height="16">
            <defs>
              <linearGradient id="tb-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#15171b" />
                <stop offset="100%" stopColor="#07090c" />
              </linearGradient>
              <linearGradient id="tb-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5eead4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="120" fill="url(#tb-bg)" />
            <g>
              <rect x="156" y="298" width="44" height="74" rx="14" fill="url(#tb-bar)" opacity="0.4" />
              <rect x="216" y="240" width="44" height="132" rx="14" fill="url(#tb-bar)" opacity="0.65" />
              <rect x="276" y="170" width="44" height="202" rx="14" fill="url(#tb-bar)" opacity="0.9" />
              <rect x="336" y="220" width="44" height="152" rx="14" fill="url(#tb-bar)" opacity="0.55" />
            </g>
          </svg>
        </span>
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
