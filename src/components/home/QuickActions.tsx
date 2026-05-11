'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BillForecastForm } from './BillForecastForm';

export function QuickActions() {
  const [showForecast, setShowForecast] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <Link
          href="/stats"
          className="bg-surface border border-border rounded-[18px] p-4 flex items-center gap-3 transition-all active:scale-[0.98] active:bg-surface-2"
        >
          <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div className="font-display text-sm font-semibold">Estatisticas</div>
            <div className="text-[11px] text-text-3">Tendencias</div>
          </div>
        </Link>
        <Link
          href="/goals"
          className="bg-surface border border-border rounded-[18px] p-4 flex items-center gap-3 transition-all active:scale-[0.98] active:bg-surface-2"
        >
          <div className="w-9 h-9 rounded-full bg-income/15 flex items-center justify-center text-income">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div>
            <div className="font-display text-sm font-semibold">Metas</div>
            <div className="text-[11px] text-text-3">Objetivos</div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setShowForecast(true)}
          className="col-span-2 bg-surface border border-border rounded-[18px] p-4 flex items-center gap-3 transition-all active:scale-[0.98] active:bg-surface-2 text-left"
        >
          <div className="w-9 h-9 rounded-full bg-warn/15 flex items-center justify-center text-warn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 5-5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm font-semibold">Simular conta</div>
            <div className="text-[11px] text-text-3">Ve se cabe no proximo mes</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-3">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <BottomSheet
        isOpen={showForecast}
        onClose={() => setShowForecast(false)}
        title="Simular conta no proximo mes"
      >
        <BillForecastForm onClose={() => setShowForecast(false)} />
      </BottomSheet>
    </>
  );
}
