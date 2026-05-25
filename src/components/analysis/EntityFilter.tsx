'use client';

import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { getEntityHue } from '@/lib/utils';

interface EntityFilterProps {
  selected: Set<string>;
  onToggle: (entityId: string) => void;
  onClear: () => void;
}

/**
 * Chip row over the user's entities. Selection acts as an inclusion filter
 * on the analysis breakdown — empty selection means "all entities".
 */
export function EntityFilter({ selected, onToggle, onClear }: EntityFilterProps) {
  const { entities } = useFinanceData();

  if (entities.length === 0) return null;

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span
          className="t-overline"
          style={{ display: 'block' }}
        >
          Filtrar por categoria
        </span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--ink-mute)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            Limpar
          </button>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {entities.map((e) => {
          const isOn = selected.has(e.id);
          const hue = getEntityHue(e);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onToggle(e.id)}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                fontFamily: 'var(--f-sans)',
                color: isOn ? 'var(--surface)' : 'var(--ink-mid)',
                background: isOn ? `oklch(0.74 0.10 ${hue})` : 'var(--surface)',
                border: `1px solid ${isOn ? `oklch(0.74 0.10 ${hue})` : 'var(--hair)'}`,
                borderRadius: 99,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.18s',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 99,
                  background: isOn ? 'var(--surface)' : `oklch(0.74 0.10 ${hue})`,
                }}
              />
              {e.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
