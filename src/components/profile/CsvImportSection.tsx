'use client';

import { useRef, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Button } from '@/components/ui/Button';
import { I } from '@/components/icons/I';
import { buildIncomesFromCsv, parseCsvText, rowsToTransactions, type ParsedCsvRow } from '@/lib/services/csvImport';
import { fmtBRL, fmtDate } from '@/lib/utils';

interface CsvImportSectionProps {
  onToast: (msg: string) => void;
}

export function CsvImportSection({ onToast }: CsvImportSectionProps) {
  const { incomes, dispatch } = useFinanceData();
  const [preview, setPreview] = useState<ParsedCsvRow[] | null>(null);
  const [filename, setFilename] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '');
      const rows = parseCsvText(text);
      const parsed = rowsToTransactions(rows);
      setPreview(parsed);
      if (parsed.length === 0) {
        onToast('Nada reconhecido no CSV. Confira o formato.');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const onConfirm = () => {
    if (!preview) return;
    const result = buildIncomesFromCsv(preview, incomes);
    for (const inc of result.incomes) {
      dispatch({ type: 'ADD_INCOME', payload: { ...inc } });
    }
    onToast(
      `${result.incomes.length} importadas` +
        (result.skipped > 0 ? ` · ${result.skipped} duplicadas ignoradas` : '')
    );
    setPreview(null);
    setFilename('');
  };

  const onCancel = () => {
    setPreview(null);
    setFilename('');
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 12 }}>
          Importar CSV
        </h3>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--ink-mute)',
            marginTop: 0,
            marginBottom: 14,
          }}
        >
          Suba um extrato do seu banco em CSV. O parser detecta data, valor
          e descrição automaticamente. Duplicadas (mesma data + valor +
          descrição) são ignoradas.
        </p>

        {!preview && (
          <>
            <Button type="button" variant="ghost" onClick={onPickFile}>
              <I.upload size={15} color="var(--ink-mid)" /> Escolher arquivo CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={onFile}
            />
          </>
        )}

        {preview && (
          <>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink-mute)',
                marginBottom: 10,
                fontFamily: 'var(--f-mono)',
              }}
            >
              {filename} · <strong>{preview.length}</strong>{' '}
              {preview.length === 1 ? 'transação detectada' : 'transações detectadas'}
            </div>
            <div
              style={{
                maxHeight: 220,
                overflowY: 'auto',
                border: '1px solid var(--hair)',
                borderRadius: 10,
                marginBottom: 12,
                background: 'var(--surface)',
              }}
            >
              {preview.slice(0, 50).map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '85px 1fr auto',
                    gap: 10,
                    padding: '8px 12px',
                    borderTop: idx === 0 ? 'none' : '1px solid var(--hair-soft)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-mute)' }}>
                    {row.date ? fmtDate(row.date) : '—'}
                  </span>
                  <span
                    style={{
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.description}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      color: row.direction === 'saida' ? 'var(--neg)' : 'var(--accent)',
                    }}
                  >
                    {row.direction === 'saida' ? '−' : '+'}
                    {fmtBRL(row.amount)}
                  </span>
                </div>
              ))}
              {preview.length > 50 && (
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: 11,
                    color: 'var(--ink-faint)',
                    textAlign: 'center',
                  }}
                >
                  +{preview.length - 50} mais (não exibidas no preview)
                </div>
              )}
            </div>
            <Button variant="accent" type="button" onClick={onConfirm}>
              Importar {preview.length} {preview.length === 1 ? 'lançamento' : 'lançamentos'}
            </Button>
            <Button variant="ghost" type="button" onClick={onCancel} className="mt-2">
              Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
