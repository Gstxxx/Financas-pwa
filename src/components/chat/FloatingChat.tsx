'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useChat } from '@/lib/contexts/ChatContext';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatEmptyState } from '@/components/chat/EmptyState';
import { Button } from '@/components/ui/Button';
import { I } from '@/components/icons/I';

/**
 * A floating ✦ button at the bottom-right of every page (except /chat
 * itself) that opens a side panel with the same chat surface. Same
 * ChatProvider underneath, so a conversation started in the panel
 * continues if you later switch to /chat (and vice versa).
 */
export function FloatingChat() {
  const pathname = usePathname();
  const router = useRouter();
  const { configured, messages, isStreaming, confirmToolCall, rejectToolCall, clearChat, settings } =
    useChat();
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Hide on /chat itself — duplicate surface would be confusing.
  const onChatPage = pathname?.startsWith('/chat') ?? false;

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages, isStreaming]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleButton = () => {
    if (!configured) {
      router.push('/profile');
      return;
    }
    setOpen((v) => !v);
  };

  if (onChatPage) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleButton}
        aria-label={open ? 'Fechar chat' : 'Abrir chat com IA'}
        className="chat-fab"
        style={{
          position: 'fixed',
          right: 22,
          bottom: 'calc(110px + env(safe-area-inset-bottom, 0px))',
          width: 52,
          height: 52,
          borderRadius: 99,
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 10px 30px color-mix(in oklch, var(--accent) 28%, transparent)',
          zIndex: 28,
          transition: 'transform 0.18s ease',
          fontSize: 22,
        }}
      >
        {open ? <I.close size={18} color="currentColor" /> : '✦'}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.32)',
              backdropFilter: 'blur(2px)',
              zIndex: 90,
              animation: 'chatPanelOverlayIn 0.2s ease',
            }}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Chat com IA"
            className="chat-panel"
            style={{
              position: 'fixed',
              top: 36,
              bottom: 0,
              right: 0,
              width: '100%',
              maxWidth: 460,
              background: 'var(--bg)',
              borderLeft: '1px solid var(--hair)',
              zIndex: 91,
              display: 'flex',
              flexDirection: 'column',
              animation: 'chatPanelSlideIn 0.28s cubic-bezier(.2,.8,.2,1)',
              boxShadow: '-24px 0 60px rgba(0, 0, 0, 0.35)',
            }}
          >
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderBottom: '1px solid var(--hair-soft)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-mute)',
                    marginBottom: 2,
                  }}
                >
                  {configured && settings.model ? `via ${settings.model}` : 'Configure em Perfil'}
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--f-display)',
                    fontStyle: 'italic',
                    fontSize: 20,
                    margin: 0,
                    color: 'var(--ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Assistente
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Link
                  href="/chat"
                  onClick={() => setOpen(false)}
                  aria-label="Abrir em tela cheia"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: '1px solid var(--hair)',
                    background: 'transparent',
                    color: 'var(--ink-mute)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontFamily: 'var(--f-mono)',
                  }}
                >
                  ⤢
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: '1px solid var(--hair)',
                    background: 'transparent',
                    color: 'var(--ink-mute)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <I.close size={12} />
                </button>
              </div>
            </header>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 18px',
                minHeight: 0,
              }}
            >
              {messages.length > 0 ? (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onConfirm={(callId) => confirmToolCall(msg.id, callId)}
                      onReject={(callId) => rejectToolCall(msg.id, callId)}
                    />
                  ))}
                  <div ref={endRef} />
                </>
              ) : (
                <ChatEmptyState />
              )}
            </div>

            {messages.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '6px 18px 0',
                }}
              >
                <Button variant="ghost" type="button" onClick={clearChat}>
                  Nova conversa
                </Button>
              </div>
            )}

            <div style={{ padding: '12px 18px 16px' }}>
              <ChatInput />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
