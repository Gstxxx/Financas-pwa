'use client';

import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { SettingsForm } from '@/components/profile/SettingsForm';
import { ExportSection } from '@/components/profile/ExportSection';
import { DangerZone } from '@/components/profile/DangerZone';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { Storage } from '@/lib/storage';

export default function ProfilePage() {
  const { toast } = useToastContext();

  return (
    <Container>
      <Header title="Perfil" subtitle="Configuracoes" />

      <div className="mt-2 space-y-4">
        <SettingsForm onSave={() => toast('Configuracoes salvas!')} />
        <ExportSection onToast={toast} />
        <DangerZone onToast={toast} />

        <div className="text-center text-[11px] text-text-3 py-4">
          <p>Dashboard Financeiro v2.0</p>
          <p className="mt-1">
            Dados {Storage.persistent ? 'salvos localmente' : 'em modo demo'}
          </p>
        </div>
      </div>
    </Container>
  );
}
