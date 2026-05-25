/**
 * Thin client for a local Ollama instance.
 *
 * We hit the HTTP API directly from the renderer — Ollama defaults to
 * binding 127.0.0.1:11434 which Electron's renderer can reach without
 * CORS problems (file:// origin is treated as trusted). PWA users on
 * the web build need OLLAMA_ORIGINS=* in their Ollama env to talk to
 * a remote-served renderer.
 *
 * Streaming uses NDJSON: each line is a JSON object terminated by \n.
 */

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  details?: {
    family?: string;
    parameter_size?: string;
  };
}

export interface OllamaToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      { type: string; description?: string; enum?: string[] }
    >;
    required?: string[];
  };
}

export interface OllamaTool {
  type: 'function';
  function: OllamaToolFunction;
}

export interface OllamaToolCall {
  id?: string;
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
}

export type OllamaRole = 'system' | 'user' | 'assistant' | 'tool';

export interface OllamaMessage {
  role: OllamaRole;
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
  /** Name of the function whose output this 'tool' message carries. Some
   * Ollama models care about this field for matching. */
  name?: string;
}

export interface OllamaSettings {
  baseUrl: string;
  model: string;
}

export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  baseUrl: 'http://localhost:11434',
  model: '',
};

export class OllamaError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'OllamaError';
    this.cause = cause;
  }
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/** Returns the list of installed models. */
export async function listModels(baseUrl: string, signal?: AbortSignal): Promise<OllamaModel[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/api/tags`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new OllamaError(`HTTP ${res.status}`);
    const data = (await res.json()) as { models?: OllamaModel[] };
    return data.models ?? [];
  } catch (err) {
    throw new OllamaError(
      `Não consegui falar com o Ollama em ${baseUrl}. Confere se ele está rodando.`,
      err
    );
  }
}

export interface StreamChunk {
  /** Cumulative content delta this chunk added. */
  contentDelta: string;
  /** Tool calls present in the final 'done' message, if any. */
  toolCalls?: OllamaToolCall[];
  done: boolean;
}

interface ChatStreamArgs {
  baseUrl: string;
  model: string;
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  signal?: AbortSignal;
  onChunk: (chunk: StreamChunk) => void;
}

/**
 * Streams a /api/chat call and invokes `onChunk` per NDJSON line. The
 * promise resolves once the model emits `done: true`. Throws on network
 * errors, abort, or non-2xx responses.
 */
export async function streamChat({
  baseUrl,
  model,
  messages,
  tools,
  signal,
  onChunk,
}: ChatStreamArgs): Promise<void> {
  const url = `${normalizeBaseUrl(baseUrl)}/api/chat`;
  const body = JSON.stringify({
    model,
    messages,
    stream: true,
    // Lower temperature for tool-calling stability. Models drift less
    // when they have function schemas to fill.
    options: { temperature: tools && tools.length > 0 ? 0.3 : 0.6 },
    ...(tools && tools.length > 0 ? { tools } : {}),
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal,
    });
  } catch (err) {
    throw new OllamaError(`Falha de rede chamando o Ollama em ${baseUrl}.`, err);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new OllamaError(`Ollama respondeu ${res.status}: ${text || res.statusText}`);
  }
  if (!res.body) {
    throw new OllamaError('Ollama não devolveu corpo de resposta.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // NDJSON: split on newlines; the last partial line stays in the buffer.
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      let parsed: {
        message?: { content?: string; tool_calls?: OllamaToolCall[] };
        done?: boolean;
        error?: string;
      };
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      if (parsed.error) {
        throw new OllamaError(parsed.error);
      }
      const contentDelta = parsed.message?.content ?? '';
      const toolCalls = parsed.message?.tool_calls;
      const isDone = Boolean(parsed.done);
      if (contentDelta || toolCalls || isDone) {
        onChunk({
          contentDelta,
          toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
          done: isDone,
        });
      }
      if (isDone) return;
    }
  }
}
