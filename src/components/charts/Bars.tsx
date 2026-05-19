'use client';

interface BarsProps {
  values: number[];
  labels?: string[];
  highlight?: number;
  width?: number;
  height?: number;
  color?: string;
  baseColor?: string;
  showLabels?: boolean;
}

export function Bars({
  values,
  labels,
  highlight = -1,
  width = 320,
  height = 130,
  color = 'var(--accent)',
  baseColor = 'var(--surface-2)',
  showLabels = true,
}: BarsProps) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values) || 1;
  const barW = width / values.length;
  const inner = barW * 0.6;
  const gap = (barW - inner) / 2;
  const chartH = showLabels ? height - 22 : height;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const h = (v / max) * (chartH - 8);
        const x = i * barW + gap;
        const y = chartH - h;
        const isHi = i === highlight;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={inner}
              height={Math.max(h, 4)}
              rx={inner / 2}
              fill={isHi ? color : baseColor}
            />
            {showLabels && labels && (
              <text
                x={x + inner / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="9.5"
                fontFamily="var(--f-mono)"
                letterSpacing="0.04em"
                fill={isHi ? 'var(--ink)' : 'var(--ink-faint)'}
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
