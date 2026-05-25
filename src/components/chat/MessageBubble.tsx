'use client';

import type { ChatMessage } from '@/lib/contexts/ChatContext';
import { ToolCallCard } from '@/components/chat/ToolCallCard';

interface MessageBubbleProps {
  message: ChatMessage;
  onConfirm: (callId: string) => void;
  onReject: (callId: string) => void;
}

export function MessageBubble({ message, onConfirm, onReject }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0' }}>
        <div
          style={{
            maxWidth: '78%',
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            padding: '10px 14px',
            borderRadius: '16px 16px 4px 16px',
            fontSize: 14,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === 'system') {
    return (
      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--ink-faint)',
          padding: '8px 0',
        }}
      >
        {message.content}
      </div>
    );
  }

  // Assistant: render pieces in order.
  const pieces = message.pieces ?? [];
  const hasContent = pieces.length > 0;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '6px 0' }}>
      <div
        style={{
          maxWidth: '88%',
          background: 'var(--surface)',
          border: '1px solid var(--hair-soft)',
          color: 'var(--ink)',
          padding: '10px 14px',
          borderRadius: '16px 16px 16px 4px',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {!hasContent && (
          <span style={{ color: 'var(--ink-mute)', fontStyle: 'italic' }}>pensando…</span>
        )}
        {pieces.map((p, idx) => {
          if (p.kind === 'text') {
            return (
              <span
                key={`t-${idx}`}
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {p.text}
              </span>
            );
          }
          return (
            <ToolCallCard
              key={p.callId}
              piece={p}
              onConfirm={() => onConfirm(p.callId)}
              onReject={() => onReject(p.callId)}
            />
          );
        })}
      </div>
    </div>
  );
}
