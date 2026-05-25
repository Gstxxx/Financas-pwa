'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useUpdater } from '@/lib/contexts/UpdaterContext';
import type { UpdateStatus } from '@/types/electron';

function statusLine(s: UpdateStatus): { text: string; tone: 'info' | 'good' | 'warn' | 'bad' } {
  switch (s.state) {
    case 'idle':
      return { text: 'Pronto para verificar.', tone: 'info' };
    case 'checking':
      return { text: 'Verificando…', tone: 'info' };
    case 'available':
      return { text: `Versão ${s.version} disponível — baixando…`, tone: 'info' };
    case 'not-available':
      return { text: `Você está na versão mais recente (${s.version}).`, tone: 'good' };
    case 'downloading':
      return { text: `Baixando… ${s.percent}%`, tone: 'info' };
    case 'downloaded':
      return { text: `Versão ${s.version} pronta para instalar.`, tone: 'good' };
    case 'error':
      return { text: `Erro: ${s.message}`, tone: 'bad' };
  }
}

const toneColor: Record<'info' | 'good' | 'warn' | 'bad', string> = {
  info: 'var(--ink-mute)',
  good: 'var(--accent)',
  warn: '#d4a017',
  bad: '#d14a3d',
};

export function UpdateSection() {
  const { available, status, check, openModal } = useUpdater();
  const [busy, setBusy] = useState(false);

  if (!available) return null;

  const onCheck = async () => {
    setBusy(true);
    try {
      await check();
    } finally {
      setBusy(false);
    }
  };

  const line = statusLine(status);
  const hasStaged =
    status.state === 'available' ||
    status.state === 'downloading' ||
    status.state === 'downloaded';

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 6 }}>
          Atualizações
        </h3>
        <div style={{ fontSize: 11, color: toneColor[line.tone], marginBottom: 14 }}>
          {line.text}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {hasStaged ? (
            <Button variant="accent" type="button" onClick={openModal}>
              Ver detalhes
            </Button>
          ) : (
            <Button variant="ghost" type="button" onClick={onCheck} disabled={busy}>
              Verificar atualizações
            </Button>
          )}
        </div>

        <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 12, lineHeight: 1.5 }}>
          Novas versões baixam em segundo plano. Quando ficam prontas, abrimos
          uma janela com o changelog antes de reiniciar.
        </div>
      </div>
    </div>
  );
}
