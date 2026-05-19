'use client';

type Size = 'xl' | 'lg' | 'md' | 'sm';

interface MoneyProps {
  value: number;
  size?: Size;
  sign?: boolean;
  color?: string;
}

const SIZES: Record<Size, { rs: number; big: number; cents: number; gap: number }> = {
  xl: { rs: 14, big: 56, cents: 22, gap: 6 },
  lg: { rs: 11, big: 32, cents: 14, gap: 4 },
  md: { rs: 10, big: 22, cents: 11, gap: 3 },
  sm: { rs: 9,  big: 16, cents: 10, gap: 2 },
};

export function Money({ value, size = 'lg', sign = true, color }: MoneyProps) {
  const negative = value < 0;
  const v = Math.abs(value);
  const reais = Math.floor(v).toLocaleString('pt-BR');
  const cents = Math.round((v - Math.floor(v)) * 100).toString().padStart(2, '0');
  const s = SIZES[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: s.gap,
        fontFamily: 'var(--f-display)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: color || 'inherit',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: s.rs,
          fontWeight: 500,
          letterSpacing: '0.08em',
          color: 'var(--ink-mute)',
          textTransform: 'uppercase',
          alignSelf: 'center',
        }}
      >
        R$
      </span>
      <span style={{ fontSize: s.big, fontWeight: 400, fontStyle: 'italic' }}>
        {sign && negative ? '−' : ''}
        {reais}
      </span>
      <span
        style={{
          fontSize: s.cents,
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--ink-mid)',
        }}
      >
        ,{cents}
      </span>
    </span>
  );
}
