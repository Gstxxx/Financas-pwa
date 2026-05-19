'use client';

import { getEntityHue } from '@/lib/utils';

interface CatPillProps {
  entity: { name: string; hue?: number | null };
}

export function CatPill({ entity }: CatPillProps) {
  if (!entity?.name) return null;
  const hue = getEntityHue(entity);
  return (
    <span
      className="pill"
      style={{
        color: `oklch(0.80 0.10 ${hue})`,
        borderColor: `oklch(0.40 0.06 ${hue} / 0.6)`,
        background: `oklch(0.24 0.04 ${hue} / 0.4)`,
      }}
    >
      <span className="dot" style={{ background: `oklch(0.78 0.12 ${hue})` }} />
      {entity.name}
    </span>
  );
}

interface TypePillProps {
  kind: 'fixo' | 'parcelado';
  current?: number;
  total?: number;
}

export function TypePill({ kind, current, total }: TypePillProps) {
  if (kind === 'parcelado' && current && total) {
    return <span className="pill">{current}/{total}</span>;
  }
  if (kind === 'parcelado' && total) {
    return <span className="pill">{total}x</span>;
  }
  return <span className="pill">Fixo</span>;
}
