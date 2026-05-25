'use client';

import { getEntityHue } from '@/lib/utils';

interface CatPillProps {
  entity: { name: string; hue?: number | null; icon?: string };
}

export function CatPill({ entity }: CatPillProps) {
  if (!entity?.name) return null;
  const hue = getEntityHue(entity);
  // Inline only the hue — the actual color values live in globals.css so
  // they can flip per theme. Trying to hardcode oklch() lightness here
  // breaks contrast in light mode (text and bg collapse onto each other).
  return (
    <span
      className="pill pill-cat"
      style={{ ['--cat-h' as string]: String(hue) }}
    >
      <span className="cat-dot" />
      {entity.icon ? <span className="cat-icon">{entity.icon}</span> : null}
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
