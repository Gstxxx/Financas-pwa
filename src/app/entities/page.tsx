'use client';

import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { EntityList } from '@/components/entities/EntityList';
import { EntityForm } from '@/components/entities/EntityForm';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinanceData } from '@/lib/contexts/FinanceContext';

export default function EntitiesPage() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToastContext();
  const { entities } = useFinanceData();

  return (
    <>
      <Container>
        <PageHead
          overline={`${entities.length} ${entities.length === 1 ? 'categoria' : 'categorias'}`}
          title="Categorias"
        />
        <EntityList />
      </Container>

      <AdaptiveFab onAction={() => setShowForm(true)} />

      <BottomSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova categoria"
      >
        <EntityForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            toast('Categoria criada!');
          }}
        />
      </BottomSheet>
    </>
  );
}
