'use client';

import { cn, fmtBRL, fmtBRLParts } from '@/lib/utils';
import { useFinanceData } from '@/lib/contexts/FinanceContext';

export function HeroBalance() {
  const { isHydrated, getTotalIncome, getTotalExpenses, getPaidExpenses, getBalance } = useFinanceData();

  if (!isHydrated) {
    return (
      <section className="hero-gradient border border-border rounded-lg p-6 mt-3.5 relative overflow-hidden animate-pulse">
        <div className="h-3 bg-white/5 rounded w-24 mb-4" />
        <div className="h-10 bg-white/5 rounded w-48 mb-4" />
        <div className="h-3 bg-white/5 rounded w-36" />
      </section>
    );
  }

  const balance = getBalance();
  const totalExpenses = getTotalExpenses();
  const paidExpenses = getPaidExpenses();
  const pendingExpenses = Math.max(totalExpenses - paidExpenses, 0);
  const projected = getTotalIncome() - totalExpenses;
  const { sign, integer, cents } = fmtBRLParts(balance);

  return (
    <section className="hero-gradient border border-border rounded-lg p-6 pt-6 mt-3.5 relative overflow-hidden animate-heroFade">
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      <div className="text-[11px] tracking-[0.14em] uppercase text-text-2 font-medium relative">
        Saldo do ciclo
      </div>
      <div
        className={cn(
          'font-display text-[40px] font-semibold tracking-tighter mt-2 flex items-baseline gap-1 relative leading-none tabular-nums',
          balance < 0 && 'text-expense'
        )}
      >
        <span className="text-lg text-text-2 font-medium mr-1">R$</span>
        {sign}{integer}
        <span className="text-[22px] text-text-2">,{cents}</span>
      </div>
      <div className="flex items-center gap-2 mt-3.5 text-[13px] text-text-2 relative">
        <span className={cn('w-1.5 h-1.5 rounded-full', projected >= 0 ? 'bg-income' : 'bg-expense')} />
        <span>
          {pendingExpenses > 0
            ? `Faltam ${fmtBRL(pendingExpenses)} a pagar este mes`
            : `Tudo pago este mes`}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[12px] text-text-3 relative font-mono tabular-nums">
        <span>
          {projected >= 0
            ? `Projetado: +${fmtBRL(projected)}`
            : `Projetado: −${fmtBRL(Math.abs(projected))}`}
        </span>
      </div>
    </section>
  );
}
