'use client';

import { Suspense, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHead } from '@/components/ui/PageHead';
import { AdaptiveFab } from '@/components/layout/AdaptiveFab';
import { DebtList } from '@/components/debts/DebtList';
import { DebtForm } from '@/components/debts/DebtForm';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Seg } from '@/components/ui/Seg';
import { CalendarStrip } from '@/components/charts/CalendarStrip';
import { useToastContext } from '@/lib/contexts/ToastContext';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { useQueryFlag } from '@/lib/hooks/useQueryFlag';
import { getCurrentMonth, getCurrentYear, fmtMonthYear } from '@/lib/utils';

type SortKey = 'venc' | 'valor' | 'nome';

export default function DebtsPage() {
  return (
    <Suspense fallback={<Container><PageHead overline="" title="Contas" /></Container>}>
      <DebtsPageInner />
    </Suspense>
  );
}

function DebtsPageInner() {
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState<SortKey>('venc');
  const { toast } = useToastContext();
  const { debts, getDueByDay } = useFinanceData();

  useQueryFlag('new', () => setShowForm(true));

  const month = getCurrentMonth();
  const year = getCurrentYear();
  const today = new Date().getDate();
  const dueByDay = getDueByDay(month, year);
  const overline = `${debts.length} ${debts.length === 1 ? 'conta' : 'contas'} · ${fmtMonthYear(month, year)}`;

  return (
    <>
      <Container>
        <PageHead overline={overline} title="Contas" />

        <div style={{ padding: '0 22px 14px' }}>
          <div className="card-flat" style={{ padding: '14px 16px 8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
              }}
            >
              <div className="t-overline">Vencimentos do mês</div>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  color: 'var(--ink-mute)',
                }}
              >
                hoje <span style={{ color: 'var(--accent)' }}>{today}</span>
              </span>
            </div>
            <CalendarStrip today={today} marked={dueByDay} width={340} height={50} />
          </div>
        </div>

        <div
          style={{
            padding: '0 22px 14px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <Seg<SortKey>
            value={sort}
            onChange={setSort}
            options={[
              { value: 'venc', label: 'Vencimento' },
              { value: 'valor', label: 'Valor' },
              { value: 'nome', label: 'Nome' },
            ]}
          />
        </div>

        <DebtList sort={sort} />
      </Container>

      <AdaptiveFab onAction={() => setShowForm(true)} />

      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="Nova conta">
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
