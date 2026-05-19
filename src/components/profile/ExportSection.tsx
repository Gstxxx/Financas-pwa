'use client';

import { useEffect, useRef, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { I } from '@/components/icons/I';
import { downloadJSON, importFromJSON, exportToDiscord } from '@/lib/services/export';
import { Storage, STORAGE_KEYS } from '@/lib/storage';

interface ExportSectionProps {
  onToast: (msg: string) => void;
}

export function ExportSection({ onToast }: ExportSectionProps) {
  const { user, entities, debts, installments, budgets, goals, incomes, dispatch } = useFinanceData();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = Storage.get<string>(STORAGE_KEYS.DISCORD_WEBHOOK);
    if (saved) setWebhookUrl(saved);
  }, []);

  const stateData = { user, entities, debts, installments, budgets, goals, incomes };

  const handleExport = () => {
    downloadJSON(stateData);
    onToast('Backup exportado!');
  };

  const handleImport = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const data = importFromJSON(json);
      if (data) {
        dispatch({ type: 'IMPORT_DATA', payload: data });
        onToast('Dados importados com sucesso!');
      } else {
        onToast('Arquivo inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleWebhookChange = (value: string) => {
    setWebhookUrl(value);
    const trimmed = value.trim();
    if (trimmed) {
      Storage.set(STORAGE_KEYS.DISCORD_WEBHOOK, trimmed);
    } else {
      Storage.remove(STORAGE_KEYS.DISCORD_WEBHOOK);
    }
  };

  const handleDiscord = async () => {
    if (!webhookUrl.trim()) return;
    setSending(true);
    const ok = await exportToDiscord(webhookUrl.trim(), stateData);
    setSending(false);
    onToast(ok ? 'Enviado para o Discord!' : 'Erro ao enviar.');
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 18 }}>
          Exportar / Importar
        </h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <Button type="button" variant="ghost" onClick={handleExport}>
            <I.download size={15} color="var(--ink-mid)" /> Exportar JSON
          </Button>
          <Button type="button" variant="ghost" onClick={handleImport}>
            <I.upload size={15} color="var(--ink-mid)" /> Importar JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--hair-soft)' }}>
          <Input
            label="Discord webhook URL"
            value={webhookUrl}
            onChange={(e) => handleWebhookChange(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
          />
          <Button
            variant="ghost"
            onClick={handleDiscord}
            disabled={sending || !webhookUrl.trim()}
            type="button"
          >
            <I.send size={14} color="var(--ink-mid)" />
            {sending ? 'Enviando...' : 'Enviar para Discord'}
          </Button>
        </div>
      </div>
    </div>
  );
}
