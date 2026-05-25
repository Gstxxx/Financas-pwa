'use client';

import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { OpenFinanceSection } from '@/components/profile/OpenFinanceSection';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinance } from '@/lib/contexts/FinanceContext';

export default function OpenFinancePage() {
  const { toast } = useToastContext();
  const { state } = useFinance();
  const count = state.bankConnections.length;

  return (
    <Container>
      <PageHead
        overline={count > 0 ? `${count} ${count === 1 ? 'banco conectado' : 'bancos conectados'}` : 'via Pluggy'}
        title="Open Finance"
      />
      <OpenFinanceSection onToast={toast} />
    </Container>
  );
}
