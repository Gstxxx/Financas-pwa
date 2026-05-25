'use client';

import { Suspense, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { GoalList } from '@/components/goals/GoalList';
import { GoalForm } from '@/components/goals/GoalForm';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { useQueryFlag } from '@/lib/hooks/useQueryFlag';

export default function GoalsPage() {
  return (
    <Suspense fallback={<Container><PageHead overline="" title="Metas" /></Container>}>
      <GoalsPageInner />
    </Suspense>
  );
}

function GoalsPageInner() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToastContext();
  const { goals } = useFinanceData();

  useQueryFlag('new', () => setShowForm(true));

  return (
    <>
      <Container>
        <PageHead
          overline={`${goals.length} ${goals.length === 1 ? 'meta' : 'metas'} · objetivos`}
          title="Metas"
          backHref="/analysis"
        />
        <GoalList />
      </Container>

      <AdaptiveFab onAction={() => setShowForm(true)} />

      <BottomSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova meta"
      >
        <GoalForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            toast('Meta criada!');
          }}
        />
      </BottomSheet>
    </>
  );
}
