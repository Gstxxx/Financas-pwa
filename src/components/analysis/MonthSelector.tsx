'use client';

import { I } from '@/components/icons/I';

const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MonthSelectorProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export function MonthSelector({ month, year, onChange }: MonthSelectorProps) {
  const prev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };

  const next = () => {
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };

  const navBtn: React.CSSProperties = {
    padding: 0,
    height: 34,
    width: 34,
    borderRadius: 99,
    border: '1px solid var(--hair)',
    background: 'var(--surface)',
    color: 'var(--ink-mid)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.18s',
  };

  return (
    <div
      className="card-flat"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
      }}
    >
      <button type="button" onClick={prev} style={navBtn} aria-label="Mês anterior">
        <I.chevL size={14} />
      </button>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--f-sans)',
            fontWeight: 500,
            fontSize: 17,
            letterSpacing: '-0.005em',
          }}
        >
          {MONTHS_FULL[month - 1]}{' '}
          <span
            style={{
              color: 'var(--ink-mute)',
              fontFamily: 'var(--f-mono)',
              fontWeight: 400,
              fontSize: 14,
            }}
          >
            {year}
          </span>
        </div>
      </div>
      <button type="button" onClick={next} style={navBtn} aria-label="Próximo mês">
        <I.chev size={14} />
      </button>
    </div>
  );
}
