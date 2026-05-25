'use client';

import Link from 'next/link';
import { useChat } from '@/lib/contexts/ChatContext';

const SUGGESTIONS = [
  'Quanto eu tenho disponível?',
  'O que vence essa semana?',
  'Onde estou gastando mais este mês?',
  'Qual a minha maior dívida em aberto?',
  'Estou no meu orçamento mensal?',
];

export function ChatEmptyState() {
  const { configured, sendMessage } = useChat();

  return (
    <div
      style={{
        padding: '40px 0 20px',
        textAlign: 'center',
        color: 'var(--ink-mid)',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div
        aria-hidden
        style={{
          fontFamily: 'var(--f-display)',
          fontSize: 42,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          marginBottom: 6,
          lineHeight: 1,
        }}
      >
        ✦
      </div>
      <h2
        style={{
          fontFamily: 'var(--f-display)',
          fontSize: 24,
          fontStyle: 'italic',
          color: 'var(--ink)',
          margin: '8px 0 8px',
        }}
      >
        Pergunte algo
      </h2>
      <p
        style={{
          fontSize: 13.5,
          color: 'var(--ink-mute)',
          lineHeight: 1.5,
          margin: '0 24px 22px',
        }}
      >
        {configured
          ? 'Eu olho suas contas, dívidas, categorias e metas em tempo real. Posso também marcar pagas, lançar receitas/despesas ou transferir entre carteiras — sempre pedindo sua confirmação primeiro.'
          : 'Pra começar, configure seu Ollama em Perfil → Inteligência Artificial. Você precisa do Ollama instalado localmente com um modelo que suporte tool-calling (llama3.2, qwen2.5, mistral).'}
      </p>

      {configured ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '0 18px',
          }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              style={{
                padding: '10px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                color: 'var(--ink-mid)',
                borderRadius: 12,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.18s, color 0.18s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface)';
                e.currentTarget.style.color = 'var(--ink-mid)';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <Link
          href="/profile"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Ir para Configurações
        </Link>
      )}
    </div>
  );
}
