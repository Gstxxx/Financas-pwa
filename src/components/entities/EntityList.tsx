'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, fmtDate } from '@/lib/utils';
import type { Entity } from '@/lib/types';

export function EntityList() {
  const { entities, debts, dispatch } = useFinanceData();
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [editName, setEditName] = useState('');

  if (entities.length === 0) {
    return <EmptyState message="Nenhuma categoria cadastrada. Crie categorias para organizar suas contas!" />;
  }

  const getDebtCount = (entityId: string) =>
    debts.filter((d) => d.entityIds.includes(entityId)).length;

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !editName.trim()) return;
    dispatch({
      type: 'UPDATE_ENTITY',
      payload: { id: selectedEntity.id, name: editName.trim() },
    });
    setSelectedEntity(null);
  };

  const handleDelete = () => {
    if (!selectedEntity) return;
    if (window.confirm('Excluir esta categoria?')) {
      dispatch({ type: 'DELETE_ENTITY', payload: selectedEntity.id });
      setSelectedEntity(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {entities.map((entity, idx) => (
          <div
            key={entity.id}
            className={cn(
              'bg-surface border border-border rounded-[18px] p-4 cursor-pointer',
              'transition-all active:scale-[0.992] active:bg-surface-2 animate-fadeUp'
            )}
            style={{ animationDelay: `${Math.min(idx, 7) * 0.04}s` }}
            onClick={() => {
              setSelectedEntity(entity);
              setEditName(entity.name);
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-display text-[17px] font-semibold tracking-tight">
                  {entity.name}
                </div>
                <div className="text-xs text-text-3 mt-1">
                  {getDebtCount(entity.id)} contas · Criado em {fmtDate(entity.createdAt.split('T')[0])}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent text-sm">
                {getDebtCount(entity.id)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomSheet
        isOpen={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
        title="Editar categoria"
      >
        {selectedEntity && (
          <form onSubmit={handleEdit}>
            <Input
              label="Nome"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              maxLength={40}
            />
            <Button type="submit">Salvar</Button>
            <Button variant="ghost" type="button" onClick={() => setSelectedEntity(null)}>
              Cancelar
            </Button>
            <Button variant="danger" type="button" onClick={handleDelete}>
              Excluir categoria
            </Button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
