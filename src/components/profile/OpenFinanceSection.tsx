'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFinance } from '@/lib/contexts/FinanceContext';
import { syncConnection } from '@/lib/services/pluggySync';
import type { BankConnection } from '@/lib/types';
import type { PluggyItemInfo } from '@/types/electron';

interface OpenFinanceSectionProps {
  onToast: (msg: string) => void;
}

declare global {
  // The Pluggy web-connect script attaches a global constructor when
  // loaded from CDN. Typed loosely on purpose — we only call init/exit.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    PluggyConnect?: new (config: {
      connectToken: string;
      includeSandbox?: boolean;
      countries?: string[];
      language?: string;
      onSuccess: (data: { item: { id: string; connector: PluggyItemInfo['connector']; status: string } }) => void;
      onError?: (err: unknown) => void;
      onExit?: () => void;
    }) => { init: () => void; exit?: () => void };
  }
}

const WIDGET_SRC = 'https://cdn.pluggy.ai/web-connect/v2.6.0/pluggy-connect.js';

function loadWidgetScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window unavailable'));
      return;
    }
    if (window.PluggyConnect) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${WIDGET_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = WIDGET_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(s);
  });
}

export function OpenFinanceSection({ onToast }: OpenFinanceSectionProps) {
  const { state, dispatch } = useFinance();
  const pluggy = typeof window !== 'undefined' ? window.electron?.pluggy : null;

  const [available, setAvailable] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);
  const [showCredsForm, setShowCredsForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const widgetRef = useRef<{ init: () => void; exit?: () => void } | null>(null);

  useEffect(() => {
    if (!pluggy) return;
    setAvailable(true);
    pluggy.hasCredentials().then(setHasCreds);
  }, [pluggy]);

  if (!available) {
    return (
      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: 22 }}>
          <h3 className="t-h3" style={{ marginBottom: 8 }}>
            Open Finance
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', margin: 0 }}>
            Disponível apenas na versão desktop do Financas.
          </p>
        </div>
      </div>
    );
  }

  const saveCredentials = async () => {
    if (!pluggy) return;
    if (!clientId.trim() || !clientSecret.trim()) return;
    setTesting(true);
    await pluggy.setCredentials({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    });
    const probe = await pluggy.testCredentials();
    setTesting(false);
    if (probe.ok) {
      setHasCreds(true);
      setShowCredsForm(false);
      setClientId('');
      setClientSecret('');
      onToast('Pluggy conectado!');
    } else {
      await pluggy.clearCredentials();
      setHasCreds(false);
      onToast(`Falha: ${probe.message ?? 'credenciais inválidas'}`);
    }
  };

  const removeCredentials = async () => {
    if (!pluggy) return;
    if (!window.confirm('Remover credenciais Pluggy? Isso não deleta as conexões já feitas.')) {
      return;
    }
    await pluggy.clearCredentials();
    setHasCreds(false);
    onToast('Credenciais removidas.');
  };

  const handleConnect = async () => {
    if (!pluggy) return;
    setConnecting(true);
    try {
      const token = await pluggy.connectToken();
      await loadWidgetScript();
      if (!window.PluggyConnect) throw new Error('Widget não carregou');
      const inst = new window.PluggyConnect({
        connectToken: token,
        includeSandbox: true,
        countries: ['BR'],
        language: 'pt',
        onSuccess: async (data) => {
          try {
            const info = await pluggy.getItem(data.item.id);
            dispatch({
              type: 'ADD_BANK_CONNECTION',
              payload: {
                pluggyItemId: data.item.id,
                institutionName: info.connector.name,
                institutionLogoUrl: info.connector.imageUrl,
                connectorId: info.connector.id,
                status: info.status === 'UPDATED' ? 'ok' : 'updating',
                statusDetail: info.statusDetail,
              },
            });
            onToast(`Conectado ${info.connector.name}!`);
          } catch (err) {
            onToast(`Erro ao salvar conexão: ${err instanceof Error ? err.message : String(err)}`);
          }
        },
        onError: (err) => {
          onToast(`Falha na conexão: ${err instanceof Error ? err.message : 'erro'}`);
        },
        onExit: () => {
          widgetRef.current = null;
          setConnecting(false);
        },
      });
      widgetRef.current = inst;
      inst.init();
    } catch (err) {
      setConnecting(false);
      onToast(`Falha: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSync = async (conn: BankConnection) => {
    setSyncing(conn.id);
    const res = await syncConnection(conn.id, conn.pluggyItemId);
    setSyncing(null);
    if (!res.ok) {
      dispatch({
        type: 'UPDATE_BANK_CONNECTION',
        payload: { id: conn.id, status: 'error', statusDetail: res.error },
      });
      onToast(`Sync falhou: ${res.error}`);
      return;
    }
    dispatch({
      type: 'IMPORT_PLUGGY_TRANSACTIONS',
      payload: {
        connectionId: conn.id,
        incomes: res.incomes,
        lastSyncAt: res.syncedAt,
      },
    });
    onToast(`${res.fetched} transações puxadas — duplicadas ignoradas.`);
  };

  const handleDisconnect = async (conn: BankConnection) => {
    if (
      !window.confirm(
        `Desconectar "${conn.institutionName}"? Você pode escolher se apaga as transações já importadas.`
      )
    )
      return;
    const purge = window.confirm(
      'Apagar também os lançamentos importados desta conexão? Clique Cancelar para mantê-los.'
    );
    if (pluggy) {
      try {
        await pluggy.deleteItem(conn.pluggyItemId);
      } catch {
        // Best-effort on Pluggy side — we still drop locally below.
      }
    }
    dispatch({
      type: 'DELETE_BANK_CONNECTION',
      payload: { id: conn.id, purgeIncomes: purge },
    });
    onToast('Conexão removida.');
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          Open Finance (via Pluggy)
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 14, lineHeight: 1.5 }}>
          Conecte suas contas bancárias via{' '}
          <a
            href="https://pluggy.ai"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--accent)' }}
          >
            Pluggy
          </a>{' '}
          (free tier: 50 conexões/mês). Transações são puxadas sob demanda e viram lançamentos
          dedupados por id Pluggy.
        </p>

        {!hasCreds && !showCredsForm && (
          <Button type="button" variant="accent" onClick={() => setShowCredsForm(true)}>
            Configurar Pluggy
          </Button>
        )}

        {!hasCreds && showCredsForm && (
          <div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 10, lineHeight: 1.4 }}>
              Vá em <code style={{ fontFamily: 'var(--f-mono)' }}>dashboard.pluggy.ai</code> →
              Applications → escolha sua aplicação → copie clientId e clientSecret.
            </p>
            <Input
              label="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              autoComplete="off"
            />
            <Input
              label="Client Secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              autoComplete="off"
            />
            <Button
              variant="accent"
              type="button"
              onClick={saveCredentials}
              disabled={testing || !clientId.trim() || !clientSecret.trim()}
            >
              {testing ? 'Testando…' : 'Salvar e testar'}
            </Button>
            <Button
              variant="ghost"
              type="button"
              className="mt-2"
              onClick={() => {
                setShowCredsForm(false);
                setClientId('');
                setClientSecret('');
              }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {hasCreds && (
          <>
            <div
              style={{
                fontSize: 11,
                color: 'var(--accent)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              ✓ Pluggy configurado
            </div>

            <Button
              variant="accent"
              type="button"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? 'Abrindo widget…' : '+ Conectar banco'}
            </Button>

            <Button variant="ghost" type="button" onClick={removeCredentials} className="mt-2">
              Remover credenciais
            </Button>

            {state.bankConnections.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div
                  className="t-overline"
                  style={{ marginBottom: 8 }}
                >
                  Bancos conectados ({state.bankConnections.length})
                </div>
                {state.bankConnections.map((conn, idx) => (
                  <ConnectionRow
                    key={conn.id}
                    conn={conn}
                    isFirst={idx === 0}
                    syncing={syncing === conn.id}
                    onSync={() => handleSync(conn)}
                    onDisconnect={() => handleDisconnect(conn)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ConnectionRow({
  conn,
  isFirst,
  syncing,
  onSync,
  onDisconnect,
}: {
  conn: BankConnection;
  isFirst: boolean;
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const last = conn.lastSyncAt
    ? new Date(conn.lastSyncAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'nunca';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 10,
        alignItems: 'center',
        padding: '12px 0',
        borderTop: isFirst ? 'none' : '1px solid var(--hair-soft)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {conn.institutionName}
          {conn.status !== 'ok' && (
            <span
              style={{
                fontSize: 10,
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: conn.status === 'error' ? 'var(--neg)' : 'var(--warn)',
                padding: '1px 6px',
                border: `1px solid currentColor`,
                borderRadius: 6,
                background: 'transparent',
              }}
            >
              {conn.status === 'error' ? 'erro' : conn.status}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-mute)',
            marginTop: 3,
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.04em',
          }}
        >
          Última sync: {last}
          {typeof conn.totalImported === 'number' &&
            conn.totalImported > 0 &&
            ` · ${conn.totalImported} importadas`}
        </div>
      </div>
      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontFamily: 'var(--f-mono)',
          color: 'var(--accent)',
          background: 'transparent',
          border: '1px solid var(--accent)',
          borderRadius: 8,
          cursor: syncing ? 'wait' : 'pointer',
          opacity: syncing ? 0.5 : 1,
        }}
      >
        {syncing ? '...' : 'Sync'}
      </button>
      <button
        type="button"
        onClick={onDisconnect}
        aria-label="Desconectar"
        style={{
          padding: '6px 10px',
          fontSize: 11,
          color: 'var(--ink-mute)',
          background: 'transparent',
          border: '1px solid var(--hair)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
}
