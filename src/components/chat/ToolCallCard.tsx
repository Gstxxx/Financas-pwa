'use client';

import type { ChatMessage } from '@/lib/contexts/ChatContext';

type AssistantPiece = NonNullable<ChatMessage['pieces']>[number];
type ToolCallPiece = Extract<AssistantPiece, { kind: 'tool_call' }>;

interface ToolCallCardProps {
  piece: ToolCallPiece;
  onConfirm: () => void;
  onReject: () => void;
}

const STATUS_LABEL: Record<ToolCallPiece['status'], { text: string; color: string }> = {
  pending_confirm: { text: 'Aguardando confirmação', color: 'var(--warn)' },
  running: { text: 'Executando…', color: 'var(--ink-mute)' },
  done: { text: 'Concluído', color: 'var(--accent)' },
  rejected: { text: 'Cancelado', color: 'var(--ink-mute)' },
  error: { text: 'Falhou', color: 'var(--neg)' },
};

export function ToolCallCard({ piece, onConfirm, onReject }: ToolCallCardProps) {
  const isWriteAction = piece.status === 'pending_confirm';
  const status = STATUS_LABEL[piece.status];
  const label = piece.description ?? `Chamando \`${piece.name}\``;

  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 6,
        padding: '12px 14px',
        background: 'var(--surface-2)',
        border: `1px solid ${piece.status === 'pending_confirm' ? 'color-mix(in oklch, var(--warn) 45%, transparent)' : 'var(--hair-soft)'}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: isWriteAction ? 8 : 4,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '-0.005em',
          }}
        >
          {isWriteAction ? '⚡ Ação solicitada' : null}
          {!isWriteAction && piece.status !== 'pending_confirm' && (
            <span style={{ color: 'var(--ink-mute)', fontSize: 11, fontFamily: 'var(--f-mono)' }}>
              {piece.name}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 10.5,
            fontFamily: 'var(--f-mono)',
            color: status.color,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {status.text}
        </span>
      </div>

      {isWriteAction && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-mid)',
            marginBottom: 12,
            lineHeight: 1.45,
          }}
        >
          {label}
        </div>
      )}

      {!isWriteAction && piece.description && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-mute)',
            lineHeight: 1.45,
          }}
        >
          {piece.description}
        </div>
      )}

      {isWriteAction && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={onReject}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'transparent',
              color: 'var(--ink-mid)',
              border: '1px solid var(--hair)',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
