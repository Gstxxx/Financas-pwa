'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { Seg } from '@/components/ui/Seg';
import { SettingsForm } from '@/components/profile/SettingsForm';
import { AppearanceSection } from '@/components/profile/AppearanceSection';
import { ExportSection } from '@/components/profile/ExportSection';
import { BackupSection } from '@/components/profile/BackupSection';
import { CsvImportSection } from '@/components/profile/CsvImportSection';
import { PinSection } from '@/components/profile/PinSection';
import { OllamaSection } from '@/components/profile/OllamaSection';
import { DesktopSection } from '@/components/profile/DesktopSection';
import { ShortcutsSection } from '@/components/profile/ShortcutsSection';
import { RecurringIncomeSection } from '@/components/profile/RecurringIncomeSection';
import { UpdateSection } from '@/components/profile/UpdateSection';
import { DangerZone } from '@/components/profile/DangerZone';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { Storage } from '@/lib/storage';

type Tab = 'geral' | 'lancamentos' | 'ia' | 'dados' | 'sistema';

const TAB_STORAGE_KEY = 'finance_profile_tab';

const TABS: { value: Tab; label: string }[] = [
  { value: 'geral', label: 'Geral' },
  { value: 'lancamentos', label: 'Lançamentos' },
  { value: 'ia', label: 'IA' },
  { value: 'dados', label: 'Dados' },
  { value: 'sistema', label: 'Sistema' },
];

export default function ProfilePage() {
  const { toast } = useToastContext();
  const [tab, setTab] = useState<Tab>('geral');

  // Persist the active tab so navigating away and coming back lands on
  // the same section. Hydrate after mount to avoid an SSR/CSR mismatch.
  useEffect(() => {
    const saved = Storage.get<Tab>(TAB_STORAGE_KEY);
    if (saved && TABS.some((t) => t.value === saved)) setTab(saved);
  }, []);

  const handleTab = (v: Tab) => {
    setTab(v);
    Storage.set(TAB_STORAGE_KEY, v);
  };

  return (
    <Container>
      <PageHead overline="Configurações" title="Perfil" />

      <div
        className="hide-scrollbar"
        style={{
          padding: '0 22px 16px',
          overflowX: 'auto',
        }}
      >
        <Seg<Tab> value={tab} onChange={handleTab} options={TABS} />
      </div>

      {tab === 'geral' && (
        <>
          <SettingsForm onSave={() => toast('Configurações salvas!')} />
          <AppearanceSection />
          <PinSection onToast={toast} />
        </>
      )}

      {tab === 'lancamentos' && (
        <>
          <RecurringIncomeSection />
          <CsvImportSection onToast={toast} />
        </>
      )}

      {tab === 'ia' && <OllamaSection onToast={toast} />}

      {tab === 'dados' && (
        <>
          <ExportSection onToast={toast} />
          <BackupSection onToast={toast} />
        </>
      )}

      {tab === 'sistema' && (
        <>
          <DesktopSection />
          <ShortcutsSection />
          <UpdateSection />
          <DangerZone onToast={toast} />
        </>
      )}

      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--ink-faint)',
          padding: '16px 22px',
        }}
      >
        <p style={{ margin: 0 }}>
          Financas v{process.env.NEXT_PUBLIC_APP_VERSION ?? '—'}
        </p>
        <p style={{ margin: '4px 0 0' }}>
          Dados {Storage.persistent ? 'salvos localmente' : 'em modo demo'}
        </p>
      </div>
    </Container>
  );
}
