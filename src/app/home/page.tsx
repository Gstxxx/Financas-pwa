'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { HeroBalance } from '@/components/home/HeroBalance';
import { StatsGrid } from '@/components/home/StatsGrid';
import { QuickActions } from '@/components/home/QuickActions';
import { UpcomingBills } from '@/components/home/UpcomingBills';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DebtForm } from '@/components/debts/DebtForm';
import { IncomeForm } from '@/components/home/IncomeForm';
import { useToastContext } from '@/lib/contexts/ToastContext';

export default function HomePage() {
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const { toast } = useToastContext();

  return (
    <>
      <Container>
        <Header />
        <HeroBalance />
        <StatsGrid />
        <QuickActions />
        <UpcomingBills />
      </Container>

      <AdaptiveFab
        onAction={() => setShowAddDebt(true)}
        secondaryAction={{
          label: 'Entrada',
          onClick: () => setShowAddIncome(true),
        }}
      />

      <BottomSheet
        isOpen={showAddDebt}
        onClose={() => setShowAddDebt(false)}
        title="Nova conta"
      >
        <DebtForm
          onClose={() => setShowAddDebt(false)}
          onSuccess={() => {
            setShowAddDebt(false);
            toast('Conta adicionada!');
          }}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        title="Nova entrada"
      >
        <IncomeForm
          onClose={() => setShowAddIncome(false)}
          onSuccess={() => {
            setShowAddIncome(false);
            toast('Entrada adicionada!');
          }}
        />
      </BottomSheet>
    </>
  );
}
