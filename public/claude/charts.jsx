// Chart primitives — SVG-based, theme-aware via CSS vars

// ── Sparkline ────────────────────────────────────────────────
function Sparkline({ values, width = 100, height = 30, color = 'var(--accent)', fill = true, last = true, strokeWidth = 1.5 }) {
  if (!values || !values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1 || 1);
  const pts = values.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 6) - 3]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const gid = 'sg' + Math.round(Math.random()*10000);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`}/>}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round"/>
      {last && <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.5" fill={color}/>}
    </svg>
  );
}

// ── Vertical bar chart ────────────────────────────────────────
function Bars({ values, labels, highlight = -1, width = 320, height = 130, color = 'var(--accent)', baseColor = 'var(--surface-2)', showLabels = true }) {
  if (!values || !values.length) return null;
  const max = Math.max(...values) || 1;
  const barW = width / values.length;
  const inner = barW * 0.6;
  const gap = (barW - inner) / 2;
  const chartH = showLabels ? height - 22 : height;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {values.map((v, i) => {
        const h = (v / max) * (chartH - 8);
        const x = i * barW + gap;
        const y = chartH - h;
        const isHi = i === highlight;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={inner} height={Math.max(h, 4)}
              rx={inner / 2}
              fill={isHi ? color : baseColor}
            />
            {showLabels && labels && (
              <text x={x + inner / 2} y={height - 4}
                    textAnchor="middle" fontSize="9.5"
                    fontFamily="var(--f-mono)"
                    letterSpacing="0.04em"
                    fill={isHi ? 'var(--ink)' : 'var(--ink-faint)'}>
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Horizontal stacked bar (already a CSS class; this is for arbitrary data) ──
function StackedBar({ items, height = 8, radius = 99 }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div style={{
      display: 'flex',
      height,
      borderRadius: radius,
      overflow: 'hidden',
      gap: 2,
      background: 'var(--surface-2)',
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          width: `${(it.value / total) * 100}%`,
          background: it.color,
          minWidth: 4,
        }}/>
      ))}
    </div>
  );
}

// ── Ring (progress arc) ──────────────────────────────────────
function Ring({ value, max = 100, size = 80, stroke = 8, color = 'var(--accent)', trackColor = 'var(--surface-2)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${c * pct} ${c * (1 - pct)}`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--f-mono)',
        fontFeatureSettings: '"tnum" 1',
      }}>{children}</div>
    </div>
  );
}

// ── Donut (multi-slice) ──────────────────────────────────────
function Donut({ slices, size = 120, stroke = 16, gap = 2, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, it) => s + it.value, 0) || 1;
  let accum = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {slices.map((s, i) => {
          const len = (s.value / total) * c - gap;
          const off = -accum;
          accum += (s.value / total) * c;
          return (
            <circle key={i}
              cx={size/2} cy={size/2} r={r}
              fill="none" stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0,len)} ${c}`}
              strokeDashoffset={off}/>
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>{children}</div>
    </div>
  );
}

// ── Calendar strip (30 days of bills due) ─────────────────────
function CalendarStrip({ today = 18, marked = {}, width = 320, height = 64 }) {
  const days = 30;
  const cellW = width / days;
  const max = Math.max(1, ...Object.values(marked));
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {Array.from({ length: days }, (_, i) => i + 1).map(d => {
        const v = marked[d] || 0;
        const h = v ? Math.max(4, (v / max) * (height - 28)) : 2;
        const isToday = d === today;
        return (
          <g key={d}>
            <rect
              x={(d - 1) * cellW + 1}
              y={height - 22 - h}
              width={cellW - 2}
              height={h}
              rx={2}
              fill={isToday ? 'var(--accent)' : (v ? 'var(--ink-mute)' : 'var(--hair)')}
              opacity={v || isToday ? 1 : 0.5}
            />
            {(d === 1 || d === 10 || d === 20 || d === today) && (
              <text x={(d - 1) * cellW + cellW/2} y={height - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="var(--f-mono)"
                    letterSpacing="0.04em"
                    fill={isToday ? 'var(--accent)' : 'var(--ink-faint)'}>
                {d}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { Sparkline, Bars, StackedBar, Ring, Donut, CalendarStrip });
