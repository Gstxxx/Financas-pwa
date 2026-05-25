'use client';

import { useEffect, useState } from 'react';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { type StoredPin, verifyPin } from '@/lib/services/pin';

/**
 * Renders a full-screen lock overlay if a PIN is configured. Children are
 * rendered behind it (so React state mounts) but pointer events are
 * blocked until unlock. Unlock state lives in memory only — reload /
 * relaunch re-prompts.
 */
export function PinGate({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredPin | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setStored(Storage.get<StoredPin>(STORAGE_KEYS.PIN_HASH) ?? null);
  }, []);

  // Loading: don't flash content while we read storage.
  if (stored === undefined) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;
  }

  if (stored && !unlocked) {
    return (
      <>
        <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          {children}
        </div>
        <LockScreen stored={stored} onUnlock={() => setUnlocked(true)} />
      </>
    );
  }

  return <>{children}</>;
}

function LockScreen({ stored, onUnlock }: { stored: StoredPin; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const ok = await verifyPin(pin, stored);
    setBusy(false);
    if (ok) {
      onUnlock();
    } else {
      setError('PIN incorreto');
      setPin('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(10, 12, 15, 0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 320,
          background: 'var(--surface)',
          border: '1px solid var(--hair)',
          borderRadius: 18,
          padding: 28,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--f-display)',
            fontSize: 28,
            fontStyle: 'italic',
            marginBottom: 6,
            color: 'var(--ink)',
          }}
        >
          Financas
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 20 }}>
          Digite seu PIN para abrir o app
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 22,
            textAlign: 'center',
            letterSpacing: '0.4em',
            background: 'var(--surface-2)',
            border: `1px solid ${error ? 'var(--neg)' : 'var(--hair)'}`,
            color: 'var(--ink)',
            borderRadius: 12,
            fontFamily: 'var(--f-mono)',
            outline: 'none',
          }}
          placeholder="••••"
        />
        {error && (
          <div style={{ color: 'var(--neg)', fontSize: 12, marginTop: 8 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={pin.length < 4 || busy}
          style={{
            width: '100%',
            marginTop: 18,
            padding: '12px',
            background: 'var(--accent)',
            color: 'var(--surface)',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: pin.length < 4 || busy ? 'not-allowed' : 'pointer',
            opacity: pin.length < 4 || busy ? 0.5 : 1,
          }}
        >
          {busy ? 'Verificando...' : 'Desbloquear'}
        </button>
      </form>
    </div>
  );
}
