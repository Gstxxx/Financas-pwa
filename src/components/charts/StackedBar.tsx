'use client';

export interface StackedItem {
  value: number;
  color: string;
}

interface StackedBarProps {
  items: StackedItem[];
  height?: number;
  radius?: number;
}

export function StackedBar({ items, height = 8, radius = 99 }: StackedBarProps) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div
      style={{
        display: 'flex',
        height,
        borderRadius: radius,
        overflow: 'hidden',
        gap: 2,
        background: 'var(--surface-2)',
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            width: `${(it.value / total) * 100}%`,
            background: it.color,
            minWidth: 4,
          }}
        />
      ))}
    </div>
  );
}
