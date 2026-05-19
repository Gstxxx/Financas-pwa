'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { HeroBalance } from '@/components/home/HeroBalance';
import { StatsGrid } from '@/components/home/StatsGrid';
import { QuickActions } from '@/components/home/QuickActions';
import { UpcomingBills } from '@/components/home/UpcomingBills';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DebtForm } from '@/components/debts/DebtForm';
import { IncomeForm } from '@/components/home/IncomeForm';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { fmtMonthYear, getCurrentMonth, getCurrentYear, getGreeting } from '@/lib/utils';

export default function HomePage() {
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const { toast } = useToastContext();
  const overline = `${getGreeting()} · ${fmtMonthYear(getCurrentMonth(), getCurrentYear())}`;

  return (
    <>
      <Container>
        <PageHead overline={overline} title="Suas finanças" />
        <HeroBalance />
        <StatsGrid />
        <QuickActions />
        <UpcomingBills />
      </Container>

      <AdaptiveFab
        onAction={() => setShowAddDebt(true)}
        secondaryAction={{
          label: 'Lançamento',
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
        title="Novo lançamento"
      >
        <IncomeForm
          onClose={() => setShowAddIncome(false)}
          onSuccess={(direction) => {
            setShowAddIncome(false);
            toast(direction === 'entrada' ? 'Entrada adicionada!' : 'PIX/saída lançada!');
          }}
        />
      </BottomSheet>
    </>
  );
}
