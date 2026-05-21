'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export function DesktopSection() {
  const [available, setAvailable] = useState(false);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const desktop = window.electron?.desktop;
    if (!desktop) return;
    setAvailable(true);
    desktop.getAutoStart().then(setAutoStart).catch(() => {});
  }, []);

  if (!available) return null;

  const toggle = async () => {
    const desktop = window.electron?.desktop;
    if (!desktop) return;
    const next = !autoStart;
    const applied = await desktop.setAutoStart(next);
    setAutoStart(applied);
  };

  const quit = () => {
    window.electron?.desktop.quit();
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 18 }}>
          Desktop
        </h3>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            paddingBottom: 14,
            borderBottom: '1px solid var(--hair-soft)',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
              Iniciar com o Windows
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4 }}>
              Abre minimizado na bandeja ao ligar o PC.
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={autoStart}
            style={{
              width: 46,
              height: 26,
              borderRadius: 99,
              border: '1px solid var(--hair)',
              background: autoStart ? 'var(--accent)' : 'var(--surface-2)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.18s ease',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: autoStart ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: autoStart ? 'var(--accent-ink)' : 'var(--ink)',
                transition: 'left 0.18s ease',
              }}
            />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <Button variant="ghost" type="button" onClick={quit}>
            Encerrar aplicativo
          </Button>
        </div>

        <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 12, lineHeight: 1.5 }}>
          Dados salvos localmente em SQLite — sem nuvem, sem conta, sem trackers.
        </div>
      </div>
    </div>
  );
}
