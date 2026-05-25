'use client';

import { useEffect, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Button } from '@/components/ui/Button';
import { I } from '@/components/icons/I';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { exportToJSON } from '@/lib/services/export';

interface BackupSectionProps {
  onToast: (msg: string) => void;
}

/**
 * Lets the user pick a local folder where Electron drops a dated backup
 * file every time they hit "Salvar". Pair it with OneDrive/Drive/Dropbox
 * sync on the chosen folder and you get cloud backup without OAuth.
 */
export function BackupSection({ onToast }: BackupSectionProps) {
  const { user, entities, debts, installments, budgets, goals, incomes, snoozes, accounts, recurringIncomes, transfers } =
    useFinanceData();
  const [folder, setFolder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFolder(Storage.get<string>(STORAGE_KEYS.BACKUP_FOLDER));
  }, []);

  const isDesktop = typeof window !== 'undefined' && !!window.electron?.desktop?.chooseBackupFolder;
  if (!isDesktop) return null;

  const pickFolder = async () => {
    const desktop = window.electron!.desktop;
    const chosen = await desktop.chooseBackupFolder();
    if (chosen) {
      Storage.set(STORAGE_KEYS.BACKUP_FOLDER, chosen);
      setFolder(chosen);
      onToast('Pasta de backup escolhida!');
    }
  };

  const writeNow = async () => {
    if (!folder) return;
    setBusy(true);
    const desktop = window.electron!.desktop;
    const stateData = {
      user, entities, debts, installments, budgets, goals, incomes, snoozes, accounts, recurringIncomes, transfers,
    };
    const json = exportToJSON(stateData);
    const result = await desktop.writeBackup({ folder, json });
    setBusy(false);
    onToast(result ? 'Backup salvo!' : 'Falha ao salvar.');
  };

  const clearFolder = () => {
    Storage.remove(STORAGE_KEYS.BACKUP_FOLDER);
    setFolder(null);
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 12 }}>
          Backup local
        </h3>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--ink-mute)',
            marginTop: 0,
            marginBottom: 14,
          }}
        >
          Aponte para uma pasta sincronizada (OneDrive, Google Drive, Dropbox)
          e mantenha cópias automáticas com data. As 30 mais recentes ficam
          guardadas; o resto é removido.
        </p>

        {folder ? (
          <>
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                borderRadius: 10,
                fontSize: 12,
                fontFamily: 'var(--f-mono)',
                color: 'var(--ink-mid)',
                marginBottom: 12,
                wordBreak: 'break-all',
              }}
            >
              {folder}
            </div>
            <Button type="button" variant="accent" onClick={writeNow} disabled={busy}>
              <I.download size={14} color="var(--surface)" /> {busy ? 'Salvando...' : 'Salvar backup agora'}
            </Button>
            <Button type="button" variant="ghost" onClick={pickFolder} className="mt-2">
              Trocar pasta
            </Button>
            <Button type="button" variant="ghost" onClick={clearFolder} className="mt-2">
              Remover pasta
            </Button>
          </>
        ) : (
          <Button type="button" variant="accent" onClick={pickFolder}>
            Escolher pasta de backup
          </Button>
        )}
      </div>
    </div>
  );
}
