'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFinance } from '@/lib/contexts/FinanceContext';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import {
  DEFAULT_OLLAMA_SETTINGS,
  OllamaError,
  type OllamaMessage,
  type OllamaSettings,
  type OllamaToolCall,
  streamChat,
} from '@/lib/services/ollama';
import {
  executeTool,
  findTool,
  toolsToOllamaSchema,
} from '@/lib/services/aiTools';

const MAX_HISTORY = 60;
const MAX_TOOL_LOOPS = 6;

type AssistantPiece =
  | { kind: 'text'; text: string }
  | {
      kind: 'tool_call';
      callId: string;
      name: string;
      args: Record<string, unknown>;
      status: 'pending_confirm' | 'running' | 'done' | 'rejected' | 'error';
      description: string | null;
      resultPreview?: string;
    };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  /** For 'user' and 'system': plain text. For 'assistant': structured
   * pieces (text + tool calls in order). */
  content?: string;
  pieces?: AssistantPiece[];
  createdAt: string;
}

interface PendingExchange {
  /** Conversation snapshot we'll resume from once a write tool is approved. */
  history: OllamaMessage[];
  assistantMessageId: string;
}

interface ChatContextValue {
  settings: OllamaSettings;
  setSettings(s: OllamaSettings): void;
  configured: boolean;

  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  hasPendingConfirmation: boolean;

  sendMessage(content: string): void;
  abort(): void;
  clearChat(): void;
  confirmToolCall(messageId: string, callId: string): void;
  rejectToolCall(messageId: string, callId: string): void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/** Built fresh per request so `today` reflects reality, not the model's
 * training cutoff. Without this the LLM happily writes 2023-xx-xx into
 * tool calls. */
function getSystemPrompt(): string {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekdayPt = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ][now.getDay()];

  return `Você é o assistente financeiro do app Financas, um dashboard pessoal de finanças do usuário (em português brasileiro).

DATA E HORA:
- Hoje é ${weekdayPt}, ${todayISO}. SEMPRE use esta como a data de referência.
- "Hoje" = ${todayISO}. "Amanhã" = ${addDaysISO(todayISO, 1)}. "Ontem" = ${addDaysISO(todayISO, -1)}.
- NUNCA invente datas. NUNCA use datas de anos anteriores como 2023, 2024 só por hábito do seu treino.
- Se o usuário não especificou uma data ao lançar despesa/receita, OMITA o parâmetro \`date\` da tool (o app preenche com hoje automaticamente). Não chute uma data.

REGRAS GERAIS:
- Responda sempre em português brasileiro.
- Use as ferramentas (tools) pra buscar dados reais. Não invente valores.
- Antes de ações que alteram dados (mark_bill_paid, add_income, add_expense, snooze_bill, transfer_between_accounts), confira com search_debts ou get_accounts pra ter os IDs corretos.
- Valores em reais (BRL). Datas no formato YYYY-MM-DD nas chamadas, mas formato humano (DD/MM/YYYY) nas respostas.
- Seja conciso. Resuma resultados de tools — não devolva JSON cru.
- Quando o usuário pedir uma ação destrutiva (apagar, marcar como pago, transferir), você chama a tool e o app pede confirmação humana antes de aplicar. Você não precisa pedir confirmação no texto.
- Se uma tool falhar ou retornar vazio, explique de forma simples e sugira alternativas.`;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildHistoryForLLM(messages: ChatMessage[]): OllamaMessage[] {
  const out: OllamaMessage[] = [{ role: 'system', content: getSystemPrompt() }];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content ?? '' });
    } else if (m.role === 'assistant' && m.pieces) {
      // Reconstruct the assistant turn as a single message + a tool message
      // per executed call (Ollama expects results in role='tool').
      const text = m.pieces
        .filter((p): p is { kind: 'text'; text: string } => p.kind === 'text')
        .map((p) => p.text)
        .join('');
      const toolCalls: OllamaToolCall[] = m.pieces
        .filter(
          (p): p is Extract<AssistantPiece, { kind: 'tool_call' }> => p.kind === 'tool_call'
        )
        .map((p) => ({
          id: p.callId,
          function: { name: p.name, arguments: p.args },
        }));
      out.push({
        role: 'assistant',
        content: text,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
      // Tool results — only for calls that actually ran.
      for (const p of m.pieces) {
        if (p.kind !== 'tool_call') continue;
        if (p.status === 'done' || p.status === 'error') {
          out.push({
            role: 'tool',
            content: p.resultPreview ?? '{}',
            tool_call_id: p.callId,
            name: p.name,
          });
        } else if (p.status === 'rejected') {
          out.push({
            role: 'tool',
            content: JSON.stringify({ cancelled: true, reason: 'user rejected the action' }),
            tool_call_id: p.callId,
            name: p.name,
          });
        }
      }
    }
  }
  return out;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // useFinance() returns the raw { state, dispatch } pair — the one we need
  // here so we can hand `state` to tool executors. (useFinanceData spreads
  // state's keys onto the top level and adds derived helpers; calling that
  // and pulling `state` from it returns undefined and every tool crashes
  // with "Cannot read property X of undefined".)
  const { state, dispatch } = useFinance();

  const [settings, setSettingsState] = useState<OllamaSettings>(DEFAULT_OLLAMA_SETTINGS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingConfirmation, setHasPendingConfirmation] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<PendingExchange | null>(null);

  // Hydrate from storage on mount.
  useEffect(() => {
    const saved = Storage.get<OllamaSettings>(STORAGE_KEYS.OLLAMA_SETTINGS);
    if (saved) setSettingsState({ ...DEFAULT_OLLAMA_SETTINGS, ...saved });
    const hist = Storage.get<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY);
    if (Array.isArray(hist)) setMessages(hist.slice(-MAX_HISTORY));
  }, []);

  // Persist on change.
  useEffect(() => {
    Storage.set(STORAGE_KEYS.OLLAMA_SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    Storage.set(STORAGE_KEYS.CHAT_HISTORY, messages.slice(-MAX_HISTORY));
  }, [messages]);

  const configured = Boolean(settings.baseUrl && settings.model);

  const setSettings = useCallback((s: OllamaSettings) => {
    setSettingsState({ ...s, baseUrl: s.baseUrl.trim() });
  }, []);

  // Append helper.
  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg].slice(-MAX_HISTORY));
  }, []);

  const updateAssistant = useCallback(
    (id: string, mutator: (pieces: AssistantPiece[]) => AssistantPiece[]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id && m.role === 'assistant'
            ? { ...m, pieces: mutator(m.pieces ?? []) }
            : m
        )
      );
    },
    []
  );

  /**
   * Drive one Ollama turn — stream text, capture tool calls, execute the
   * read-safe ones inline, queue the write ones for confirmation. Returns
   * when the model finishes or pauses waiting for confirmation.
   */
  const runTurn = useCallback(
    async (history: OllamaMessage[], assistantId: string) => {
      let loop = 0;
      let workingHistory = history;
      while (loop < MAX_TOOL_LOOPS) {
        loop++;
        const ac = new AbortController();
        abortRef.current = ac;

        let textBuf = '';
        let pendingCalls: OllamaToolCall[] = [];

        try {
          await streamChat({
            baseUrl: settings.baseUrl,
            model: settings.model,
            messages: workingHistory,
            tools: toolsToOllamaSchema(),
            signal: ac.signal,
            onChunk: (chunk) => {
              if (chunk.contentDelta) {
                textBuf += chunk.contentDelta;
                updateAssistant(assistantId, (pieces) => {
                  // Append to the last text piece or push new one.
                  const last = pieces[pieces.length - 1];
                  if (last && last.kind === 'text') {
                    return [
                      ...pieces.slice(0, -1),
                      { ...last, text: last.text + chunk.contentDelta },
                    ];
                  }
                  return [...pieces, { kind: 'text', text: chunk.contentDelta }];
                });
              }
              if (chunk.toolCalls) pendingCalls = chunk.toolCalls;
            },
          });
        } catch (err) {
          if (ac.signal.aborted) {
            return; // user cancelled
          }
          const msg = err instanceof OllamaError ? err.message : String(err);
          setError(msg);
          updateAssistant(assistantId, (pieces) => [
            ...pieces,
            { kind: 'text', text: `\n\n[erro: ${msg}]` },
          ]);
          return;
        } finally {
          abortRef.current = null;
        }

        if (pendingCalls.length === 0) {
          // Plain answer, no tool calls. Done.
          return;
        }

        // Normalize args (Ollama sometimes returns them as a string).
        const normalizedCalls = pendingCalls.map((c, i) => ({
          id: c.id ?? `${assistantId}-${loop}-${i}`,
          name: c.function.name,
          args:
            typeof c.function.arguments === 'string'
              ? safeParseArgs(c.function.arguments)
              : c.function.arguments,
        }));

        // Decide each call's initial status.
        const callPieces: Extract<AssistantPiece, { kind: 'tool_call' }>[] = normalizedCalls.map(
          (call) => {
            const tool = findTool(call.name);
            const needsConfirm = tool?.safety === 'confirm';
            return {
              kind: 'tool_call',
              callId: call.id,
              name: call.name,
              args: call.args,
              status: needsConfirm ? 'pending_confirm' : 'running',
              description: tool?.describeCall(call.args, state) ?? null,
            };
          }
        );
        updateAssistant(assistantId, (pieces) => [...pieces, ...callPieces]);

        // Run read-safe calls immediately.
        const anyNeedsConfirm = callPieces.some((c) => c.status === 'pending_confirm');
        for (const c of callPieces) {
          if (c.status !== 'running') continue;
          const result = executeTool(c.name, c.args, { state, dispatch });
          updateAssistant(assistantId, (pieces) =>
            pieces.map((p) =>
              p.kind === 'tool_call' && p.callId === c.callId
                ? {
                    ...p,
                    status: result.ok ? 'done' : 'error',
                    resultPreview: result.output,
                  }
                : p
            )
          );
        }

        if (anyNeedsConfirm) {
          // Pause: wait for user to confirm/reject via context API. We
          // stash the current working history snapshot so we can resume
          // building it once the user reacts.
          pendingRef.current = {
            history: workingHistory,
            assistantMessageId: assistantId,
          };
          setHasPendingConfirmation(true);
          return;
        }

        // All read tools done. Build the next round of history (with the
        // assistant's tool_calls + the tool results) and loop back to the
        // model so it can synthesize a final answer.
        workingHistory = buildHistoryForLLM([
          ...messages,
          // Read the latest version of the current assistant message:
          // we need to pull from state because updateAssistant has run.
          ...readAssistantSnapshot(assistantId),
        ]);
      }
    },
    [dispatch, messages, settings.baseUrl, settings.model, state, updateAssistant]
  );

  // Helper: reads the current state.messages for a specific assistant id.
  // We use a setMessages callback trick: pass a function that doesn't mutate
  // but captures the current array.
  const readAssistantSnapshot = useCallback(
    (assistantId: string): ChatMessage[] => {
      let snapshot: ChatMessage[] = [];
      setMessages((prev) => {
        snapshot = prev;
        return prev;
      });
      const found = snapshot.find((m) => m.id === assistantId);
      return found ? [found] : [];
    },
    []
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isStreaming || !configured) return;
      setError(null);
      const userMsg: ChatMessage = {
        id: newId(),
        role: 'user',
        content: content.trim(),
        createdAt: nowISO(),
      };
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: 'assistant',
        pieces: [],
        createdAt: nowISO(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg].slice(-MAX_HISTORY));
      setIsStreaming(true);
      const history = buildHistoryForLLM([...messages, userMsg]);
      runTurn(history, assistantMsg.id).finally(() => {
        setIsStreaming(false);
      });
    },
    [configured, isStreaming, messages, runTurn]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const clearChat = useCallback(() => {
    abort();
    pendingRef.current = null;
    setHasPendingConfirmation(false);
    setMessages([]);
    setError(null);
  }, [abort]);

  const resumeAfterConfirmation = useCallback(
    async (assistantId: string) => {
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      setHasPendingConfirmation(false);
      setIsStreaming(true);
      // Rebuild history with the now-resolved tool calls and loop again.
      const snapshot = readAssistantSnapshot(assistantId);
      const history = buildHistoryForLLM([...messages, ...snapshot]);
      try {
        await runTurn(history, assistantId);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, readAssistantSnapshot, runTurn]
  );

  const confirmToolCall = useCallback(
    (messageId: string, callId: string) => {
      // Look up the call to run from the latest messages snapshot rather
      // than mutating a closed-over let inside a setState callback — TS
      // can't narrow the latter through the lambda boundary.
      let target: { name: string; args: Record<string, unknown> } | null = null;
      setMessages((prev) => {
        const m = prev.find((x) => x.id === messageId);
        if (m?.role === 'assistant' && m.pieces) {
          const piece = m.pieces.find(
            (p) => p.kind === 'tool_call' && p.callId === callId
          );
          if (
            piece &&
            piece.kind === 'tool_call' &&
            piece.status === 'pending_confirm'
          ) {
            target = { name: piece.name, args: piece.args };
          }
        }
        return prev.map((mm) => {
          if (mm.id !== messageId || mm.role !== 'assistant' || !mm.pieces) return mm;
          return {
            ...mm,
            pieces: mm.pieces.map((p) =>
              p.kind === 'tool_call' &&
              p.callId === callId &&
              p.status === 'pending_confirm'
                ? { ...p, status: 'running' }
                : p
            ),
          };
        });
      });
      const toRun = target as { name: string; args: Record<string, unknown> } | null;
      if (!toRun) return;
      // Execute then mark done.
      const result = executeTool(toRun.name, toRun.args, { state, dispatch });
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || m.role !== 'assistant' || !m.pieces) return m;
          return {
            ...m,
            pieces: m.pieces.map((p) =>
              p.kind === 'tool_call' && p.callId === callId
                ? {
                    ...p,
                    status: result.ok ? 'done' : 'error',
                    resultPreview: result.output,
                  }
                : p
            ),
          };
        })
      );
      // If all pending confirmations are now resolved, resume the model.
      const stillPending = peekHasPendingConfirmation(messageId);
      if (!stillPending) {
        void resumeAfterConfirmation(messageId);
      }
    },
    [dispatch, resumeAfterConfirmation, state]
  );

  const rejectToolCall = useCallback(
    (messageId: string, callId: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || m.role !== 'assistant' || !m.pieces) return m;
          return {
            ...m,
            pieces: m.pieces.map((p) =>
              p.kind === 'tool_call' && p.callId === callId
                ? { ...p, status: 'rejected' }
                : p
            ),
          };
        })
      );
      const stillPending = peekHasPendingConfirmation(messageId);
      if (!stillPending) {
        void resumeAfterConfirmation(messageId);
      }
    },
    [resumeAfterConfirmation]
  );

  // Reads the latest state of an assistant message to check pending calls.
  const peekHasPendingConfirmation = useCallback((messageId: string): boolean => {
    let pending = false;
    setMessages((prev) => {
      const m = prev.find((x) => x.id === messageId);
      if (m?.role === 'assistant' && m.pieces) {
        pending = m.pieces.some(
          (p) => p.kind === 'tool_call' && p.status === 'pending_confirm'
        );
      }
      return prev;
    });
    return pending;
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      settings,
      setSettings,
      configured,
      messages,
      isStreaming,
      error,
      hasPendingConfirmation,
      sendMessage,
      abort,
      clearChat,
      confirmToolCall,
      rejectToolCall,
    }),
    [
      settings,
      setSettings,
      configured,
      messages,
      isStreaming,
      error,
      hasPendingConfirmation,
      sendMessage,
      abort,
      clearChat,
      confirmToolCall,
      rejectToolCall,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}

function safeParseArgs(s: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
