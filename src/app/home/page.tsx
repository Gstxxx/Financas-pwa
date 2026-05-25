'use client';

import { Suspense, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { HeroBalance } from '@/components/home/HeroBalance';
import { AccountsStrip } from '@/components/home/AccountsStrip';
import { InsightsCard } from '@/components/home/InsightsCard';
import { StatsGrid } from '@/components/home/StatsGrid';
import { QuickActions } from '@/components/home/QuickActions';
import { UpcomingBills } from '@/components/home/UpcomingBills';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DebtForm } from '@/components/debts/DebtForm';
import { IncomeForm } from '@/components/home/IncomeForm';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useQueryFlag } from '@/lib/hooks/useQueryFlag';
import { fmtMonthYear, getCurrentMonth, getCurrentYear, getGreeting } from '@/lib/utils';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <Container width="wide">
          <PageHead overline="" title="Suas finanças" />
        </Container>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const { toast } = useToastContext();

  useQueryFlag('income', () => setShowAddIncome(true));
  useQueryFlag('new', () => setShowAddDebt(true));

  const overline = `${getGreeting()} · ${fmtMonthYear(getCurrentMonth(), getCurrentYear())}`;

  return (
    <>
      <Container width="wide">
        <PageHead overline={overline} title="Suas finanças" />
        <div className="home-split">
          <div className="home-col">
            <HeroBalance />
            <AccountsStrip />
            <InsightsCard />
            <StatsGrid />
            <QuickActions />
          </div>
          <div className="home-col">
            <UpcomingBills />
          </div>
        </div>
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
