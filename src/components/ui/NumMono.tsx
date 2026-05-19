'use client';

interface NumMonoProps {
  value: number;
  sign?: 'pos' | 'neg' | false;
  color?: string;
  weight?: number;
  size?: number;
}

export function NumMono({
  value,
  sign = false,
  color,
  weight = 500,
  size = 16,
}: NumMonoProps) {
  const v = Math.abs(value);
  const reais = Math.floor(v).toLocaleString('pt-BR');
  const cents = Math.round((v - Math.floor(v)) * 100).toString().padStart(2, '0');
  const prefix = sign === 'neg' ? '−' : sign === 'pos' ? '+' : '';

  return (
    <span
      style={{
        fontFamily: 'var(--f-mono)',
        fontFeatureSettings: '"tnum" 1',
        fontSize: size,
        fontWeight: weight,
        letterSpacing: '-0.02em',
        color: color || 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {prefix}
      <span style={{ fontSize: size * 0.66, color: 'var(--ink-mute)', marginRight: 2 }}>
        R$
      </span>
      {reais}
      <span style={{ color: 'var(--ink-mute)' }}>,{cents}</span>
    </span>
  );
}
