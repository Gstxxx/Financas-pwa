'use client';

import { useEffect, useRef } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { Button } from '@/components/ui/Button';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatEmptyState } from '@/components/chat/EmptyState';
import { useChat } from '@/lib/contexts/ChatContext';

export default function ChatPage() {
  const { messages, isStreaming, confirmToolCall, rejectToolCall, clearChat, settings } =
    useChat();
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or streaming progresses.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  const hasMessages = messages.length > 0;

  return (
    <Container width="wide">
      <PageHead
        overline={settings.model ? `via ${settings.model}` : 'Configure em Perfil'}
        title="Assistente"
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 240px)',
          padding: '0 22px 16px',
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: 16,
          }}
        >
          {hasMessages ? (
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

        {hasMessages && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 10,
            }}
          >
            <Button variant="ghost" type="button" onClick={clearChat}>
              Nova conversa
            </Button>
          </div>
        )}

        <ChatInput />
      </div>
    </Container>
  );
}
