'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { GoalList } from '@/components/goals/GoalList';
import { GoalForm } from '@/components/goals/GoalForm';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinanceData } from '@/lib/contexts/FinanceContext';

export default function GoalsPage() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToastContext();
  const { goals } = useFinanceData();

  return (
    <>
      <Container>
        <Header
          title="Metas"
          subtitle={`${goals.length} ${goals.length === 1 ? 'meta' : 'metas'}`}
        />
        <div className="mt-2">
          <GoalList />
        </div>
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
