// Shared UI primitives + reusable components

const { useState, useMemo, useEffect, useRef } = React;

// Currency display: big number with display serif, cents smaller, R$ small caps
function Money({ value, size = 'lg', sign = true }) {
  const negative = value < 0;
  const v = Math.abs(value);
  const reais = Math.floor(v).toLocaleString('pt-BR');
  const cents = Math.round((v - Math.floor(v)) * 100).toString().padStart(2, '0');
  const sizes = {
    xl: { rs: 14, big: 56, cents: 22, gap: 6 },
    lg: { rs: 11, big: 32, cents: 14, gap: 4 },
    md: { rs: 10, big: 22, cents: 11, gap: 3 },
    sm: { rs: 9,  big: 16, cents: 10, gap: 2 },
  };
  const s = sizes[size];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: s.gap,
      fontFamily: 'var(--f-display)',
      lineHeight: 1, letterSpacing: '-0.02em',
      color: 'inherit',
    }}>
      <span style={{
        fontFamily: 'var(--f-sans)',
        fontSize: s.rs, fontWeight: 500,
        letterSpacing: '0.08em',
        color: 'var(--ink-mute)',
        textTransform: 'uppercase',
        alignSelf: 'center',
      }}>R$</span>
      <span style={{ fontSize: s.big, fontWeight: 400, fontStyle: 'italic' }}>
        {sign && negative ? '−' : ''}{reais}
      </span>
      <span style={{
        fontSize: s.cents, fontWeight: 400, fontStyle: 'italic',
        color: 'var(--ink-mid)',
      }}>,{cents}</span>
    </span>
  );
}

// Mono number (for compact rows)
function NumMono({ value, sign = false, color, weight = 500, size = 16 }) {
  const v = Math.abs(value);
  const reais = Math.floor(v).toLocaleString('pt-BR');
  const cents = Math.round((v - Math.floor(v)) * 100).toString().padStart(2, '0');
  return (
    <span style={{
      fontFamily: 'var(--f-mono)',
      fontFeatureSettings: '"tnum" 1',
      fontSize: size, fontWeight: weight,
      letterSpacing: '-0.02em',
      color: color || 'inherit',
    }}>
      {sign === 'neg' ? '−' : sign === 'pos' ? '+' : ''}
      <span style={{ fontSize: size * 0.66, color: 'var(--ink-mute)', marginRight: 2 }}>R$</span>
      {reais}<span style={{ color: 'var(--ink-mute)' }}>,{cents}</span>
    </span>
  );
}

// Pill — category badge
function CatPill({ cat }) {
  if (!cat) return null;
  const c = MOCK.CATEGORIES.find(x => x.id === cat);
  if (!c) return null;
  return (
    <span className="pill" style={{
      color: `oklch(0.80 0.10 ${c.hue})`,
      borderColor: `oklch(0.40 0.06 ${c.hue} / 0.6)`,
      background: `oklch(0.24 0.04 ${c.hue} / 0.4)`,
    }}>
      <span className="dot" style={{ background: `oklch(0.78 0.12 ${c.hue})` }} />
      {c.name}
    </span>
  );
}

// Status pill
function StatusPill({ status }) {
  if (status === 'em-dia')   return <span className="pill pill-pos"><span className="dot"/>Em dia</span>;
  if (status === 'vence')    return <span className="pill pill-warn"><span className="dot"/>Vence em breve</span>;
  if (status === 'atrasado') return <span className="pill pill-neg"><span className="dot"/>Atrasado</span>;
  return null;
}

// Account row
function AccountRow({ a, onClick }) {
  return (
    <div className="row" onClick={onClick}>
      <div className="name">{a.name}</div>
      <div className="amount" style={{ color: 'var(--ink)' }}>
        <NumMono value={a.amount} sign="neg" size={17}/>
      </div>
      <div className="meta">
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          {MOCK.dueLabel(a)}
        </span>
      </div>
      <div className="right-meta">
        <StatusPill status={a.status}/>
      </div>
      {a.parcela && (
        <>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
              PARCELA {a.parcela.current}/{a.parcela.total}
            </span>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--f-mono)' }}>
              {Math.round(a.parcela.current / a.parcela.total * 100)}%
            </span>
          </div>
          <div className="progress"><div className="progress-fill" style={{ width: `${a.parcela.current / a.parcela.total * 100}%` }}/></div>
        </>
      )}
      <div className="tags">
        {a.cats.map(c => <CatPill key={c} cat={c} />)}
      </div>
    </div>
  );
}

// Page header
function PageHead({ overline, title, right }) {
  return (
    <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <div className="eyebrow"><span className="dot"/><span className="t-overline">{overline}</span></div>
        <h1 className="t-h1">{title}</h1>
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { Money, NumMono, CatPill, StatusPill, AccountRow, PageHead });
