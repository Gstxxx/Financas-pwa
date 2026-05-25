'use client';

import { Suspense, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { AccountList } from '@/components/accounts/AccountList';
import { AccountForm } from '@/components/accounts/AccountForm';
import { TransferForm } from '@/components/accounts/TransferForm';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { useQueryFlag } from '@/lib/hooks/useQueryFlag';

export default function AccountsPage() {
  return (
    <Suspense fallback={<Container><PageHead overline="" title="Carteiras" /></Container>}>
      <AccountsPageInner />
    </Suspense>
  );
}

function AccountsPageInner() {
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const { toast } = useToastContext();
  const { accounts } = useFinanceData();

  useQueryFlag('new', () => setShowForm(true));
  useQueryFlag('transfer', () => setShowTransfer(true));

  const overline = `${accounts.length} ${accounts.length === 1 ? 'conta bancária' : 'contas bancárias'}`;
  const canTransfer = accounts.filter((a) => !a.archived).length >= 2;

  return (
    <>
      <Container>
        <PageHead overline={overline} title="Carteiras" />

        {canTransfer && (
          <div style={{ padding: '0 22px 14px' }}>
            <Button variant="ghost" type="button" onClick={() => setShowTransfer(true)}>
              ⇄ Transferir entre contas
            </Button>
          </div>
        )}

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

      <BottomSheet
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        title="Transferência"
      >
        <TransferForm
          onClose={() => setShowTransfer(false)}
          onSuccess={() => {
            setShowTransfer(false);
            toast('Transferência registrada!');
          }}
        />
      </BottomSheet>
    </>
  );
}
