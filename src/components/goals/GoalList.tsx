'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { fmtBRL, cn } from '@/lib/utils';
import type { Goal } from '@/lib/types';

const GOAL_TYPE_LABELS: Record<string, string> = {
  savings: 'Poupanca',
  emergency: 'Reserva emergencia',
  'debt-free': 'Quitar dividas',
  custom: 'Personalizada',
};

export function GoalList() {
  const { goals, dispatch } = useFinanceData();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editValue, setEditValue] = useState('');

  if (goals.length === 0) {
    return <EmptyState message="Nenhuma meta cadastrada. Defina metas para acompanhar seu progresso!" />;
  }

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    dispatch({
      type: 'UPDATE_GOAL',
      payload: { id: selectedGoal.id, currentValue: parseFloat(editValue) || 0 },
    });
    setSelectedGoal(null);
  };

  const handleDelete = () => {
    if (!selectedGoal) return;
    if (window.confirm('Excluir esta meta?')) {
      dispatch({ type: 'DELETE_GOAL', payload: selectedGoal.id });
      setSelectedGoal(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {goals.map((goal, idx) => {
          const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
          return (
            <div
              key={goal.id}
              className={cn(
                'bg-surface border border-border rounded-[18px] p-4 cursor-pointer',
                'transition-all active:scale-[0.992] active:bg-surface-2 animate-fadeUp'
              )}
              style={{ animationDelay: `${Math.min(idx, 7) * 0.04}s` }}
              onClick={() => {
                setSelectedGoal(goal);
                setEditValue(String(goal.currentValue));
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-display text-[17px] font-semibold tracking-tight">
                    {goal.name}
                  </div>
                  <div className="text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] bg-accent/15 text-accent uppercase tracking-wide inline-block mt-1">
                    {GOAL_TYPE_LABELS[goal.type] || goal.type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-base font-semibold tabular-nums">
                    {fmtBRL(goal.currentValue)}
                  </div>
                  <div className="text-[11px] text-text-3">
                    de {fmtBRL(goal.targetValue)}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar value={progress} label={`${progress.toFixed(1)}%`} />
              </div>
            </div>
          );
        })}
      </div>

      <BottomSheet
        isOpen={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        title={selectedGoal?.name}
      >
        {selectedGoal && (
          <form onSubmit={handleUpdateProgress}>
            <Input
              label="Valor atual (R$)"
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              inputMode="decimal"
            />
            <Button type="submit">Atualizar progresso</Button>
            <Button variant="ghost" type="button" onClick={() => setSelectedGoal(null)}>
              Fechar
            </Button>
            <Button variant="danger" type="button" onClick={handleDelete}>
              Excluir meta
            </Button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
