'use client';

interface CalendarStripProps {
  today: number;
  marked: Record<number, number>;
  days?: number;
  width?: number;
  height?: number;
}

export function CalendarStrip({
  today,
  marked,
  days = 30,
  width = 320,
  height = 64,
}: CalendarStripProps) {
  const cellW = width / days;
  const max = Math.max(1, ...Object.values(marked));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
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
              fill={isToday ? 'var(--accent)' : v ? 'var(--ink-mute)' : 'var(--hair)'}
              opacity={v || isToday ? 1 : 0.5}
            />
            {(d === 1 || d === 10 || d === 20 || d === today) && (
              <text
                x={(d - 1) * cellW + cellW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--f-mono)"
                letterSpacing="0.04em"
                fill={isToday ? 'var(--accent)' : 'var(--ink-faint)'}
              >
                {d}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
