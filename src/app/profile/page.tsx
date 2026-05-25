'use client';

import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { SettingsForm } from '@/components/profile/SettingsForm';
import { AppearanceSection } from '@/components/profile/AppearanceSection';
import { ExportSection } from '@/components/profile/ExportSection';
import { BackupSection } from '@/components/profile/BackupSection';
import { CsvImportSection } from '@/components/profile/CsvImportSection';
import { PinSection } from '@/components/profile/PinSection';
import { DesktopSection } from '@/components/profile/DesktopSection';
import { ShortcutsSection } from '@/components/profile/ShortcutsSection';
import { RecurringIncomeSection } from '@/components/profile/RecurringIncomeSection';
import { UpdateSection } from '@/components/profile/UpdateSection';
import { DangerZone } from '@/components/profile/DangerZone';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { Storage } from '@/lib/storage';

export default function ProfilePage() {
  const { toast } = useToastContext();

  return (
    <Container>
      <PageHead overline="Configurações" title="Perfil" />

      <SettingsForm onSave={() => toast('Configurações salvas!')} />
      <RecurringIncomeSection />
      <AppearanceSection />
      <PinSection onToast={toast} />
      <ExportSection onToast={toast} />
      <CsvImportSection onToast={toast} />
      <BackupSection onToast={toast} />
      <DesktopSection />
      <ShortcutsSection />
      <UpdateSection />
      <DangerZone onToast={toast} />

      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--ink-faint)',
          padding: '16px 22px',
        }}
      >
        <p style={{ margin: 0 }}>Dashboard Financeiro v2.0</p>
        <p style={{ margin: '4px 0 0' }}>
          Dados {Storage.persistent ? 'salvos localmente' : 'em modo demo'}
        </p>
      </div>
    </Container>
  );
}
