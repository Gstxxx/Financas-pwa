'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useChat } from '@/lib/contexts/ChatContext';
import { listModels, OllamaError, type OllamaModel } from '@/lib/services/ollama';

interface OllamaSectionProps {
  onToast: (msg: string) => void;
}

type Probe =
  | { state: 'idle' }
  | { state: 'probing' }
  | { state: 'ok'; models: OllamaModel[] }
  | { state: 'error'; message: string };

export function OllamaSection({ onToast }: OllamaSectionProps) {
  const { settings, setSettings, configured } = useChat();
  const [url, setUrl] = useState(settings.baseUrl);
  const [model, setModel] = useState(settings.model);
  const [probe, setProbe] = useState<Probe>({ state: 'idle' });

  // Keep the local form in sync if external code (import) replaces settings.
  useEffect(() => {
    setUrl(settings.baseUrl);
    setModel(settings.model);
  }, [settings.baseUrl, settings.model]);

  const probeConnection = async () => {
    setProbe({ state: 'probing' });
    try {
      const models = await listModels(url);
      setProbe({ state: 'ok', models });
      if (models.length > 0) {
        // Pre-select a sensible default if none chosen yet.
        if (!model) {
          const preferred =
            models.find((m) => /llama3\.2|qwen2\.5|mistral/i.test(m.name))?.name ??
            models[0].name;
          setModel(preferred);
        }
      }
    } catch (err) {
      const msg = err instanceof OllamaError ? err.message : String(err);
      setProbe({ state: 'error', message: msg });
    }
  };

  const save = () => {
    setSettings({ baseUrl: url.trim(), model });
    onToast('Configurações de IA salvas!');
  };

  const probeButtonLabel =
    probe.state === 'probing'
      ? 'Conectando…'
      : probe.state === 'ok'
        ? `Conectado · ${probe.models.length} ${probe.models.length === 1 ? 'modelo' : 'modelos'}`
        : 'Testar conexão';

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 8 }}>
          Inteligência Artificial
        </h3>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--ink-mute)',
            marginTop: 0,
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Conecte um Ollama local pra usar o assistente em <strong>Chat</strong>. Ele
          consulta suas contas, dívidas e categorias e pode lançar despesas/marcar
          pagas — sempre pedindo sua confirmação primeiro.{' '}
          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--accent)' }}
          >
            Como instalar
          </a>
        </p>

        <Input
          label="URL do Ollama"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:11434"
          autoComplete="off"
        />

        {probe.state === 'ok' && probe.models.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Modelo</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 14,
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                color: 'var(--ink)',
                borderRadius: 12,
                fontFamily: 'var(--f-sans)',
                outline: 'none',
              }}
            >
              <option value="">— selecione —</option>
              {probe.models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                  {m.details?.parameter_size ? ` (${m.details.parameter_size})` : ''}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>
              Recomendado: llama3.2, qwen2.5, mistral — esses suportam tool-calling.
            </p>
          </div>
        )}

        {probe.state === 'error' && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--neg)',
              padding: '10px 12px',
              background: 'color-mix(in oklch, var(--neg) 10%, transparent)',
              border: '1px solid color-mix(in oklch, var(--neg) 30%, transparent)',
              borderRadius: 10,
              marginBottom: 14,
              lineHeight: 1.45,
            }}
          >
            {probe.message}
          </div>
        )}

        <Button variant="ghost" type="button" onClick={probeConnection}>
          {probeButtonLabel}
        </Button>
        <Button variant="accent" type="button" onClick={save} className="mt-2" disabled={!url || !model}>
          {configured ? 'Atualizar' : 'Salvar'}
        </Button>

        {configured && (
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--accent)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            ✓ Conectado · vai em Chat pra usar
          </div>
        )}
      </div>
    </div>
  );
}
