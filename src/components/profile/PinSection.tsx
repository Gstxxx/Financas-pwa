'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { isPinValid, makeStoredPin, verifyPin, type StoredPin } from '@/lib/services/pin';

interface PinSectionProps {
  onToast: (msg: string) => void;
}

export function PinSection({ onToast }: PinSectionProps) {
  const [stored, setStored] = useState<StoredPin | null>(null);
  const [mode, setMode] = useState<'idle' | 'create' | 'remove'>('idle');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStored(Storage.get<StoredPin>(STORAGE_KEYS.PIN_HASH) ?? null);
  }, []);

  const reset = () => {
    setPin1('');
    setPin2('');
    setError(null);
    setMode('idle');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isPinValid(pin1)) {
      setError('PIN deve ter entre 4 e 8 dígitos numéricos.');
      return;
    }
    if (pin1 !== pin2) {
      setError('Os dois PINs não batem.');
      return;
    }
    setBusy(true);
    const next = await makeStoredPin(pin1);
    Storage.set(STORAGE_KEYS.PIN_HASH, next);
    setStored(next);
    setBusy(false);
    onToast('PIN configurado!');
    reset();
  };

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!stored) return;
    setBusy(true);
    const ok = await verifyPin(pin1, stored);
    setBusy(false);
    if (!ok) {
      setError('PIN incorreto.');
      return;
    }
    Storage.remove(STORAGE_KEYS.PIN_HASH);
    setStored(null);
    onToast('PIN removido.');
    reset();
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          PIN de abertura
        </h3>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--ink-mute)',
            marginTop: 0,
            marginBottom: 14,
          }}
        >
          {stored
            ? 'PIN ativo. Pediremos toda vez que o app abrir.'
            : 'Sem PIN. Qualquer um que abrir esta máquina vê seus dados.'}
        </p>

        {mode === 'idle' &&
          (stored ? (
            <Button type="button" variant="ghost" onClick={() => setMode('remove')}>
              Remover PIN
            </Button>
          ) : (
            <Button type="button" variant="accent" onClick={() => setMode('create')}>
              Configurar PIN
            </Button>
          ))}

        {mode === 'create' && (
          <form onSubmit={handleCreate}>
            <PinInput
              label="Novo PIN (4-8 dígitos)"
              value={pin1}
              onChange={setPin1}
              autoFocus
            />
            <PinInput label="Confirme o PIN" value={pin2} onChange={setPin2} />
            {error && <div style={{ color: 'var(--neg)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <Button type="submit" variant="accent" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="ghost" type="button" onClick={reset} className="mt-2">
              Cancelar
            </Button>
          </form>
        )}

        {mode === 'remove' && (
          <form onSubmit={handleRemove}>
            <PinInput
              label="Digite o PIN atual para remover"
              value={pin1}
              onChange={setPin1}
              autoFocus
            />
            {error && <div style={{ color: 'var(--neg)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? 'Verificando...' : 'Remover PIN'}
            </Button>
            <Button variant="ghost" type="button" onClick={reset} className="mt-2">
              Cancelar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function PinInput({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="field-label">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: 18,
          letterSpacing: '0.3em',
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--hair)',
          color: 'var(--ink)',
          borderRadius: 12,
          fontFamily: 'var(--f-mono)',
          outline: 'none',
        }}
        placeholder="••••"
      />
    </div>
  );
}
