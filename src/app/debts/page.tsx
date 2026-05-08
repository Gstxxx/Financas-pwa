'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { DebtList } from '@/components/debts/DebtList';
import { DebtForm } from '@/components/debts/DebtForm';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinanceData } from '@/lib/contexts/FinanceContext';

export default function DebtsPage() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToastContext();
  const { debts } = useFinanceData();

  return (
    <>
      <Container>
        <Header
          title="Contas"
          subtitle={`${debts.length} ${debts.length === 1 ? 'conta' : 'contas'}`}
        />
        <div className="mt-2">
          <DebtList />
        </div>
      </Container>

      <AdaptiveFab onAction={() => setShowForm(true)} />

      <BottomSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova conta"
      >
        <DebtForm
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
