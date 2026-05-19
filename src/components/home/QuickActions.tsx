'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BillForecastForm } from './BillForecastForm';
import { I } from '@/components/icons/I';

interface QuickActionProps {
  icon: ReactNode;
  title: string;
  sub: string;
  href?: string;
  onClick?: () => void;
  arrow?: boolean;
  wide?: boolean;
}

function QuickAction({ icon, title, sub, href, onClick, arrow, wide }: QuickActionProps) {
  const inner = (
    <>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--hair)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 2 }}>{sub}</div>
      </div>
      {arrow && <I.chev size={14} color="var(--ink-mute)" />}
    </>
  );

  const className = 'card-flat';
  const style: React.CSSProperties = {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    transition: 'background 0.18s',
    textDecoration: 'none',
    color: 'inherit',
    gridColumn: wide ? '1 / -1' : undefined,
    textAlign: 'left' as const,
    border: '1px solid var(--hair-soft)',
    background: 'var(--bg-elev)',
    borderRadius: 'var(--r-md)',
    font: 'inherit',
    width: '100%',
  };

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={className} style={style} onClick={onClick}>
      {inner}
    </button>
  );
}

export function QuickActions() {
  const [showForecast, setShowForecast] = useState(false);

  return (
    <>
      <div
        style={{
          padding: '10px 22px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <QuickAction
          href="/stats"
          icon={<I.spark size={16} color="var(--cat-1)" />}
          title="Estatísticas"
          sub="Tendências"
        />
        <QuickAction
          href="/goals"
          icon={<I.target size={16} color="var(--accent)" />}
          title="Metas"
          sub="Objetivos"
        />
      </div>
      <div style={{ padding: '10px 22px 0' }}>
        <QuickAction
          onClick={() => setShowForecast(true)}
          icon={<I.bolt size={16} color="var(--warn)" />}
          title="Simular conta"
          sub="Veja se cabe no próximo mês"
          wide
          arrow
        />
      </div>

      <BottomSheet
        isOpen={showForecast}
        onClose={() => setShowForecast(false)}
        title="Simular conta no próximo mês"
      >
        <BillForecastForm onClose={() => setShowForecast(false)} />
      </BottomSheet>
    </>
  );
}
