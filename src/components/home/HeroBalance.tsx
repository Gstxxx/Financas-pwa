'use client';

import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Money } from '@/components/ui/Money';
import { Sparkline } from '@/components/charts/Sparkline';
import { fmtBRL } from '@/lib/utils';

export function HeroBalance() {
  const {
    isHydrated,
    getTotalIncome,
    getTotalExpenses,
    getPaidExpenses,
    getPixOutForMonth,
    getBalance,
    getRecentBalances,
  } = useFinanceData();

  if (!isHydrated) {
    return (
      <div style={{ padding: '0 22px' }}>
        <div className="card" style={{ padding: '22px 24px 24px', minHeight: 168 }} />
      </div>
    );
  }

  const now = new Date();
  const balance = getBalance();
  const totalExpenses = getTotalExpenses();
  const paidExpenses = getPaidExpenses();
  const pixOut = getPixOutForMonth(now.getMonth() + 1, now.getFullYear());
  // "Faltam a pagar" = bills/installments deste mês ainda não pagos.
  // PIX/saídas avulsas já saíram da conta — não contam como pendência.
  const pendingExpenses = Math.max(totalExpenses - paidExpenses - pixOut, 0);
  const projected = getTotalIncome() - totalExpenses;
  const recent = getRecentBalances(5);
  const negative = balance < 0;

  return (
    <div style={{ padding: '0 22px' }} className="animate-heroFade">
      <div
        className="card"
        style={{ padding: '22px 24px 24px', position: 'relative', overflow: 'hidden' }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -30,
            top: -50,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, color-mix(in oklch, var(--accent) 14%, transparent), transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
            position: 'relative',
          }}
        >
          <div className="t-overline">Saldo do ciclo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" />
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
              }}
            >
              Ao vivo
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 12,
            position: 'relative',
          }}
        >
          <div style={{ color: negative ? 'var(--neg)' : 'var(--ink)' }}>
            <Money value={balance} size="xl" />
          </div>
          {recent.length > 1 && (
            <div style={{ flexShrink: 0, opacity: 0.9 }}>
              <Sparkline
                values={recent}
                width={92}
                height={36}
                color={negative ? 'var(--neg)' : 'var(--accent)'}
              />
              <div
                style={{
                  fontSize: 9.5,
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textAlign: 'right',
                  marginTop: 2,
                  fontFamily: 'var(--f-mono)',
                }}
              >
                {recent.length} ciclos
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 99,
              background: pendingExpenses > 0 ? 'var(--neg)' : 'var(--accent)',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink-mid)' }}>
            {pendingExpenses > 0 ? (
              <>
                Faltam{' '}
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink)' }}>
                  {fmtBRL(pendingExpenses)}
                </span>{' '}
                a pagar este mês
              </>
            ) : (
              'Tudo pago este mês'
            )}
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: 'var(--ink-mute)',
            position: 'relative',
          }}
        >
          Projetado para fim do ciclo ·{' '}
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              color: projected < 0 ? 'var(--neg)' : 'var(--ink-mid)',
            }}
          >
            {projected < 0 ? '−' : '+'}
            {fmtBRL(Math.abs(projected))}
          </span>
        </div>
      </div>
    </div>
  );
}
