'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/lib/contexts/ChatContext';

const PLACEHOLDER_HINTS = [
  'Quanto eu tenho disponível?',
  'O que vence essa semana?',
  'Onde estou gastando mais?',
  'Marca a conta da internet como paga',
  'Lança uma despesa de R$30 em mercado',
];

export function ChatInput() {
  const { sendMessage, isStreaming, abort, configured, hasPendingConfirmation } = useChat();
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_HINTS[0]);

  useEffect(() => {
    const idx = Math.floor(Math.random() * PLACEHOLDER_HINTS.length);
    setPlaceholder(PLACEHOLDER_HINTS[idx]);
  }, []);

  // Auto-resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  const submit = () => {
    if (!value.trim()) return;
    sendMessage(value);
    setValue('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const disabled = !configured || hasPendingConfirmation;
  const canSend = value.trim().length > 0 && configured && !hasPendingConfirmation && !isStreaming;

  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--bg-elev)',
        border: '1px solid var(--hair)',
        borderRadius: 18,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          !configured
            ? 'Configure o Ollama em Perfil → IA'
            : hasPendingConfirmation
              ? 'Confirme ou cancele a ação acima primeiro'
              : placeholder
        }
        disabled={disabled}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--ink)',
          fontFamily: 'var(--f-sans)',
          fontSize: 14,
          lineHeight: 1.45,
          resize: 'none',
          minHeight: 22,
          maxHeight: 160,
        }}
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={abort}
          aria-label="Parar"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid var(--hair)',
            background: 'transparent',
            color: 'var(--ink-mid)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              background: 'var(--ink-mid)',
              borderRadius: 2,
            }}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Enviar"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: 'none',
            background: canSend ? 'var(--accent)' : 'var(--surface-2)',
            color: canSend ? 'var(--accent-ink)' : 'var(--ink-faint)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 18,
            transition: 'background-color 0.18s',
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
}
