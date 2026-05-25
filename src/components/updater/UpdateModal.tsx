'use client';

import { useEffect } from 'react';
import { useUpdater } from '@/lib/contexts/UpdaterContext';
import { formatBytes, formatSpeed } from '@/lib/services/updaterApi';
import { renderMarkdown } from '@/lib/services/mdLite';
import { I } from '@/components/icons/I';

/**
 * Full-screen overlay that walks the user through an available update:
 *   1. "Atualização disponível" header + version chip
 *   2. Changelog (markdown from the GitHub release body)
 *   3. Footer:
 *        - downloading:  progress bar + speed
 *        - downloaded:   primary CTA "Reiniciar agora"
 *
 * Close button (X) is suppressed while downloading so the user doesn't
 * accidentally orphan a half-baked install. Once downloaded, dismiss
 * defers the install — the toast notification from main still surfaces
 * it, and /profile keeps a manual trigger.
 */
export function UpdateModal() {
  const {
    available,
    status,
    version,
    changelog,
    loadingChangelog,
    modalOpen,
    closeModal,
    install,
  } = useUpdater();

  // Lock body scroll while open so the page underneath doesn't move.
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  if (!available || !modalOpen) return null;

  const isDownloading = status.state === 'downloading' || status.state === 'available';
  const isDownloaded = status.state === 'downloaded';
  const isError = status.state === 'error';
  const canClose = !isDownloading || isDownloaded;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in oklch, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        padding: 22,
        animation: 'updateOverlayIn 0.24s ease',
      }}
    >
      <style>{`
        @keyframes updateOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes updateCardIn {
          from { opacity: 0; transform: translateY(8px) scale(0.99); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: 'calc(100vh - 60px)',
          background: 'var(--bg-elev)',
          border: '1px solid var(--hair)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'updateCardIn 0.28s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 24px 16px',
            borderBottom: '1px solid var(--hair-soft)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'color-mix(in oklch, var(--accent) 18%, transparent)',
              border: '1px solid color-mix(in oklch, var(--accent) 38%, transparent)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <I.spark size={18} color="currentColor" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                marginBottom: 4,
              }}
            >
              {isDownloaded
                ? 'Pronto para instalar'
                : isError
                  ? 'Falha na atualização'
                  : 'Atualização disponível'}
            </div>
            <div
              id="update-modal-title"
              style={{
                fontFamily: 'var(--f-display)',
                fontSize: 26,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              Financas
              {version && (
                <span
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 14,
                    fontStyle: 'normal',
                    color: 'var(--accent)',
                    padding: '2px 8px',
                    borderRadius: 99,
                    border: '1px solid color-mix(in oklch, var(--accent) 35%, transparent)',
                    background: 'color-mix(in oklch, var(--accent) 14%, transparent)',
                    letterSpacing: '0.02em',
                  }}
                >
                  v{version}
                </span>
              )}
            </div>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={closeModal}
              aria-label="Fechar"
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                border: '1px solid var(--hair)',
                background: 'transparent',
                color: 'var(--ink-mute)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <I.close size={12} />
            </button>
          )}
        </div>

        {/* Changelog body */}
        <div
          style={{
            padding: '12px 24px 16px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          <ChangelogContent
            changelog={changelog}
            loading={loadingChangelog}
            version={version}
            error={isError ? (status as { state: 'error'; message: string }).message : null}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px 22px',
            borderTop: '1px solid var(--hair-soft)',
            background: 'var(--bg)',
          }}
        >
          {isError ? (
            <ErrorFooter onClose={closeModal} />
          ) : isDownloaded ? (
            <DownloadedFooter onInstall={install} onLater={closeModal} version={version} />
          ) : (
            <DownloadingFooter status={status} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChangelogContent({
  changelog,
  loading,
  version,
  error,
}: {
  changelog: string | null;
  loading: boolean;
  version: string;
  error: string | null;
}) {
  if (error) {
    return (
      <div
        style={{
          padding: '16px 0',
          color: 'var(--neg)',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: 0, marginBottom: 8 }}>{error}</p>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-mute)' }}>
          Tente novamente em alguns segundos. Se persistir, abra o log em{' '}
          <code style={{ fontFamily: 'var(--f-mono)' }}>%AppData%\Financas\logs\main.log</code>.
        </p>
      </div>
    );
  }

  if (loading && !changelog) {
    return (
      <div
        style={{
          padding: '32px 0',
          textAlign: 'center',
          color: 'var(--ink-mute)',
          fontSize: 12,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.06em',
        }}
      >
        Carregando notas da versão…
      </div>
    );
  }

  if (!changelog) {
    return (
      <div
        style={{
          padding: '24px 0',
          color: 'var(--ink-mute)',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        Sem notas publicadas pra v{version}. Mas a versão ainda é mais nova que a sua.
      </div>
    );
  }

  return <div style={{ paddingTop: 4 }}>{renderMarkdown(changelog)}</div>;
}

function DownloadingFooter({ status }: { status: import('@/types/electron').UpdateStatus }) {
  const percent = status.state === 'downloading' ? status.percent : 0;
  const speed =
    status.state === 'downloading' && status.bytesPerSecond
      ? formatSpeed(status.bytesPerSecond)
      : null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          color: 'var(--ink-mute)',
          letterSpacing: '0.04em',
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        <span>{status.state === 'available' ? 'Iniciando download…' : `Baixando · ${percent}%`}</span>
        {speed && <span style={{ color: 'var(--ink-mid)' }}>{speed}</span>}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 99,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(2, percent)}%`,
            background: 'var(--accent)',
            borderRadius: 99,
            transition: 'width 0.4s cubic-bezier(.2,.8,.2,1)',
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-faint)',
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        Você pode continuar usando o app enquanto baixa.
      </div>
    </div>
  );
}

function DownloadedFooter({
  onInstall,
  onLater,
  version,
}: {
  onInstall: () => void;
  onLater: () => void;
  version: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onInstall}
        style={{
          width: '100%',
          padding: '14px 18px',
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          border: 'none',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '-0.005em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 6px 24px color-mix(in oklch, var(--accent) 25%, transparent)',
        }}
      >
        OK, iniciar novamente
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            opacity: 0.85,
          }}
        >
          → v{version}
        </span>
      </button>
      <button
        type="button"
        onClick={onLater}
        style={{
          width: '100%',
          marginTop: 8,
          padding: '10px',
          background: 'transparent',
          color: 'var(--ink-mute)',
          border: 'none',
          borderRadius: 12,
          fontSize: 12.5,
          cursor: 'pointer',
        }}
      >
        Instalar depois
      </button>
      <div
        style={{
          fontSize: 11,
          color: 'var(--ink-faint)',
          marginTop: 6,
          textAlign: 'center',
        }}
      >
        Leva ~3 segundos. A janela fecha e reabre sozinha.
      </div>
    </div>
  );
}

function ErrorFooter({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      style={{
        width: '100%',
        padding: '12px',
        background: 'transparent',
        color: 'var(--ink)',
        border: '1px solid var(--hair)',
        borderRadius: 12,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      Fechar
    </button>
  );
}
