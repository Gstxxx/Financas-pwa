'use client';

import { useMemo, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EntityForm } from '@/components/entities/EntityForm';
import { NumMono } from '@/components/ui/NumMono';
import { getCurrentMonth, getCurrentYear, getEntityGlyph, getEntityHue } from '@/lib/utils';
import type { Entity } from '@/lib/types';

export function EntityList() {
  const { entities, debts, dispatch, getBreakdown } = useFinanceData();
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  const month = getCurrentMonth();
  const year = getCurrentYear();
  const breakdown = useMemo(() => getBreakdown(month, year), [getBreakdown, month, year]);
  const totalOut = breakdown.reduce((s, b) => s + b.value, 0) || 1;
  const valueByEntity = new Map(breakdown.map((b) => [b.entityId, b]));

  if (entities.length === 0) {
    return (
      <div style={{ padding: '0 22px' }}>
        <EmptyState message="Nenhuma categoria cadastrada. Crie categorias para organizar suas contas!" />
      </div>
    );
  }

  const getDebtCount = (entityId: string) =>
    debts.filter((d) => d.entityIds.includes(entityId)).length;

  const handleDelete = () => {
    if (!selectedEntity) return;
    if (window.confirm('Excluir esta categoria?')) {
      dispatch({ type: 'DELETE_ENTITY', payload: selectedEntity.id });
      setSelectedEntity(null);
    }
  };

  return (
    <>
      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {entities.map((entity, idx) => {
            const hue = getEntityHue(entity);
            const count = getDebtCount(entity.id);
            const bd = valueByEntity.get(entity.id);
            const value = bd?.value ?? 0;
            const pct = value > 0 ? (value / totalOut) * 100 : 0;
            const glyph = getEntityGlyph(entity);
            return (
              <div
                key={entity.id}
                style={{
                  padding: '18px 20px',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--hair-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedEntity(entity)}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: `oklch(0.26 0.05 ${hue})`,
                    border: `1px solid oklch(0.40 0.08 ${hue} / 0.5)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--f-sans)',
                    fontWeight: glyph.isEmoji ? 400 : 600,
                    fontSize: glyph.isEmoji ? 20 : 16,
                    letterSpacing: glyph.isEmoji ? 0 : '-0.01em',
                    color: `oklch(0.85 0.10 ${hue})`,
                    flexShrink: 0,
                  }}
                >
                  {glyph.value}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em' }}>
                    {entity.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-mute)',
                      marginTop: 3,
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {count} {count === 1 ? 'conta' : 'contas'}
                  </div>
                  {value > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        height: 3,
                        borderRadius: 99,
                        background: 'var(--surface-2)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, pct)}%`,
                          background: `oklch(0.74 0.10 ${hue})`,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {value > 0 ? (
                    <>
                      <NumMono value={value} size={14} sign="neg" />
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-faint)',
                          marginTop: 3,
                          fontFamily: 'var(--f-mono)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {pct.toFixed(1)}%
                      </div>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-faint)',
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomSheet
        isOpen={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
        title="Editar categoria"
      >
        {selectedEntity && (
          <>
            <EntityForm
              initialEntity={selectedEntity}
              onClose={() => setSelectedEntity(null)}
              onSuccess={() => setSelectedEntity(null)}
            />
            <Button variant="danger" type="button" onClick={handleDelete} className="mt-2">
              Excluir categoria
            </Button>
          </>
        )}
      </BottomSheet>
    </>
  );
}
