'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFinance } from '@/lib/contexts/FinanceContext';
import { fullSyncItem } from '@/lib/services/pluggySync';
import type { BankConnection } from '@/lib/types';
import type { PluggyAppSessionInfo, PluggyItemInfo } from '@/types/electron';

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

  // App Session (dashboard JWT) mode — alternative path.
  const [sessionInfo, setSessionInfo] = useState<PluggyAppSessionInfo>({ hasSession: false });
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionInput, setSessionInput] = useState('');
  const [sessionTesting, setSessionTesting] = useState(false);
  const [importingItems, setImportingItems] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);

  const refreshSessionInfo = async () => {
    if (!pluggy) return;
    const info = await pluggy.getAppSessionInfo();
    setSessionInfo(info);
  };

  useEffect(() => {
    if (!pluggy) return;
    setAvailable(true);
    pluggy.hasCredentials().then(setHasCreds);
    pluggy.getAppSessionInfo().then(setSessionInfo);
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
    const res = await fullSyncItem(conn.pluggyItemId, conn.id);
    setSyncing(null);
    if (!res.ok || !res.payload) {
      dispatch({
        type: 'UPDATE_BANK_CONNECTION',
        payload: { id: conn.id, status: 'error', statusDetail: res.error },
      });
      onToast(`Sync falhou: ${res.error}`);
      return;
    }
    dispatch({ type: 'IMPORT_PLUGGY_FULL', payload: res.payload });
    onToast(
      `${res.fetchedTransactions} transações · ${res.accountCount} carteiras atualizadas`
    );
  };

  const saveSession = async () => {
    if (!pluggy || !sessionInput.trim()) return;
    setSessionTesting(true);
    await pluggy.setAppSession(sessionInput.trim());
    const probe = await pluggy.testAppSession();
    setSessionTesting(false);
    if (probe.ok) {
      await refreshSessionInfo();
      setShowSessionForm(false);
      setSessionInput('');
      onToast('Sessão Pluggy ativa!');
    } else {
      await pluggy.clearAppSession();
      await refreshSessionInfo();
      onToast(`Falha: ${probe.message ?? 'token inválido'}`);
    }
  };

  const removeSession = async () => {
    if (!pluggy) return;
    if (!window.confirm('Remover sessão Pluggy? As conexões importadas ficam.')) return;
    await pluggy.clearAppSession();
    await refreshSessionInfo();
    onToast('Sessão removida.');
  };

  const importItemsFromSession = async (
    silent = false
  ): Promise<{ items: number; accounts: number; transactions: number }> => {
    const totals = { items: 0, accounts: 0, transactions: 0 };
    if (!pluggy) return totals;
    setImportingItems(true);
    try {
      const items = (await pluggy.listItems()) as PluggyItemInfo[];
      for (const item of items) {
        const existing = state.bankConnections.find((c) => c.pluggyItemId === item.id);
        const sync = await fullSyncItem(item.id, existing?.id);
        if (!sync.ok || !sync.payload) {
          if (!silent) {
            onToast(`Falha em ${item.connector?.name ?? 'item'}: ${sync.error ?? 'erro'}`);
          }
          continue;
        }
        dispatch({ type: 'IMPORT_PLUGGY_FULL', payload: sync.payload });
        totals.items += 1;
        totals.accounts += sync.accountCount;
        totals.transactions += sync.fetchedTransactions;
      }
      if (!silent) {
        if (totals.items === 0) {
          onToast('Nenhum banco pra importar');
        } else {
          onToast(
            `${totals.items} ${totals.items === 1 ? 'banco' : 'bancos'} · ${totals.accounts} carteiras · ${totals.transactions} transações`
          );
        }
      }
      return totals;
    } catch (err) {
      onToast(`Falha ao listar: ${err instanceof Error ? err.message : String(err)}`);
      return totals;
    } finally {
      setImportingItems(false);
    }
  };

  /**
   * One-click flow: opens meu.pluggy.ai in a child window, sniffs the
   * Bearer token from the first authenticated request, then auto-imports
   * the items the user already has linked over there.
   */
  const handleAutoLogin = async () => {
    if (!pluggy) return;
    setAutoLoggingIn(true);
    try {
      const result = await pluggy.loginFlow();
      await refreshSessionInfo();
      if (!result.ok) {
        onToast(result.message ?? 'Login cancelado');
        return;
      }
      onToast('Token capturado!');
      const totals = await importItemsFromSession(true);
      if (totals.items === 0) {
        onToast('Sessão pronta — sem bancos pra importar');
      } else {
        onToast(
          `${totals.items} ${totals.items === 1 ? 'banco' : 'bancos'} · ${totals.accounts} carteiras · ${totals.transactions} transações`
        );
      }
    } finally {
      setAutoLoggingIn(false);
    }
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
      {/* — Modo App Session (atalho via JWT do dashboard) — */}
      <div className="card" style={{ padding: 22, marginBottom: 14 }}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          App Session (atalho)
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 14, lineHeight: 1.5 }}>
          Em vez de criar app no dashboard de devs, cole aqui o JWT que o
          dashboard{' '}
          <a
            href="https://meu.pluggy.ai"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--accent)' }}
          >
            meu.pluggy.ai
          </a>{' '}
          usa. <strong>Trade-off:</strong> token expira em ~24h — toda vez
          precisa repegar do DevTools (Network → qualquer request →
          Authorization: Bearer ...).
        </p>

        {!sessionInfo.hasSession && !showSessionForm && (
          <>
            <Button
              type="button"
              variant="accent"
              onClick={handleAutoLogin}
              disabled={autoLoggingIn}
            >
              {autoLoggingIn ? 'Aguardando login…' : '⚡ Conectar via dashboard (automático)'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => setShowSessionForm(true)}
            >
              Ou cole token manualmente
            </Button>
          </>
        )}

        {!sessionInfo.hasSession && showSessionForm && (
          <div>
            <label className="field-label">JWT (começa com eyJ…)</label>
            <textarea
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="eyJhbGciOiJSUzI1NiIs…"
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: 88,
                padding: '10px 12px',
                fontSize: 11,
                fontFamily: 'var(--f-mono)',
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                color: 'var(--ink)',
                borderRadius: 12,
                outline: 'none',
                resize: 'vertical',
                marginBottom: 12,
                wordBreak: 'break-all',
              }}
            />
            <Button
              type="button"
              variant="accent"
              onClick={saveSession}
              disabled={sessionTesting || !sessionInput.trim()}
            >
              {sessionTesting ? 'Testando…' : 'Salvar e testar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                setShowSessionForm(false);
                setSessionInput('');
              }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {sessionInfo.hasSession && (
          <div>
            <div
              style={{
                padding: '10px 12px',
                background: sessionInfo.expired
                  ? 'color-mix(in oklch, var(--neg) 12%, transparent)'
                  : 'color-mix(in oklch, var(--accent) 10%, transparent)',
                border: `1px solid ${
                  sessionInfo.expired
                    ? 'color-mix(in oklch, var(--neg) 30%, transparent)'
                    : 'color-mix(in oklch, var(--accent) 28%, transparent)'
                }`,
                borderRadius: 10,
                marginBottom: 12,
                fontSize: 12,
                lineHeight: 1.5,
                color: sessionInfo.expired ? 'var(--neg)' : 'var(--ink-mid)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                  color: sessionInfo.expired ? 'var(--neg)' : 'var(--accent)',
                }}
              >
                {sessionInfo.expired ? '× expirado' : '✓ ativo'}
              </div>
              {sessionInfo.email && <div>{sessionInfo.email}</div>}
              {sessionInfo.expiresAt && (
                <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>
                  Expira em {new Date(sessionInfo.expiresAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>

            {sessionInfo.expired ? (
              <Button
                type="button"
                variant="accent"
                onClick={handleAutoLogin}
                disabled={autoLoggingIn}
              >
                {autoLoggingIn ? 'Aguardando login…' : '⚡ Renovar via dashboard'}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => importItemsFromSession(false)}
                  disabled={importingItems}
                >
                  {importingItems ? 'Importando…' : 'Importar tudo (bancos + carteiras + transações)'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  onClick={handleAutoLogin}
                  disabled={autoLoggingIn}
                >
                  {autoLoggingIn ? 'Aguardando…' : '⚡ Renovar via dashboard'}
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => setShowSessionForm(true)}
            >
              Colar novo token manualmente
            </Button>
            <Button type="button" variant="ghost" className="mt-2" onClick={removeSession}>
              Remover sessão
            </Button>
          </div>
        )}

        {sessionInfo.hasSession && showSessionForm && (
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Novo JWT</label>
            <textarea
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="eyJhbGciOiJSUzI1NiIs…"
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: 88,
                padding: '10px 12px',
                fontSize: 11,
                fontFamily: 'var(--f-mono)',
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                color: 'var(--ink)',
                borderRadius: 12,
                outline: 'none',
                resize: 'vertical',
                marginBottom: 12,
                wordBreak: 'break-all',
              }}
            />
            <Button
              type="button"
              variant="accent"
              onClick={saveSession}
              disabled={sessionTesting || !sessionInput.trim()}
            >
              {sessionTesting ? 'Testando…' : 'Atualizar token'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                setShowSessionForm(false);
                setSessionInput('');
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

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
