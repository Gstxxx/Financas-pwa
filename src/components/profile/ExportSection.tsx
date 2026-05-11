'use client';

import { useEffect, useRef, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
        onToast('Arquivo invalido.');
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
    <div className="bg-surface border border-border rounded-[18px] p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold mb-4">Exportar / Importar</h3>

      <Button onClick={handleExport}>
        Exportar JSON
      </Button>

      <Button variant="ghost" onClick={handleImport}>
        Importar JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="pt-3 border-t border-border mt-3">
        <Input
          label="Discord Webhook URL"
          value={webhookUrl}
          onChange={(e) => handleWebhookChange(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
        <Button
          variant="ghost"
          onClick={handleDiscord}
          disabled={sending || !webhookUrl.trim()}
        >
          {sending ? 'Enviando...' : 'Enviar para Discord'}
        </Button>
      </div>
    </div>
  );
}
