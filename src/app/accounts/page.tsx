'use client';

import { Suspense, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { AccountList } from '@/components/accounts/AccountList';
import { AccountForm } from '@/components/accounts/AccountForm';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { useQueryFlag } from '@/lib/hooks/useQueryFlag';

export default function AccountsPage() {
  return (
    <Suspense fallback={<Container><PageHead overline="" title="Contas bancárias" /></Container>}>
      <AccountsPageInner />
    </Suspense>
  );
}

function AccountsPageInner() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToastContext();
  const { accounts } = useFinanceData();

  useQueryFlag('new', () => setShowForm(true));

  const overline = `${accounts.length} ${accounts.length === 1 ? 'conta bancária' : 'contas bancárias'}`;

  return (
    <>
      <Container>
        <PageHead overline={overline} title="Carteiras" />
        <AccountList />
      </Container>

      <AdaptiveFab onAction={() => setShowForm(true)} />

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Nova conta">
        <AccountForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            toast('Conta adicionada!');
          }}
        />
      </BottomSheet>
    </>
  );
}
