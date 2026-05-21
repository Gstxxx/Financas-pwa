'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumMono } from '@/components/ui/NumMono';
import { Ring } from '@/components/charts/Ring';
import { fmtMoneyInput, getEntityHue, parseMoney } from '@/lib/utils';
import type { Goal } from '@/lib/types';

const GOAL_TYPE_LABELS: Record<string, string> = {
  savings: 'Poupança',
  emergency: 'Reserva emergência',
  'debt-free': 'Quitar dívidas',
  custom: 'Personalizada',
};

function monthsUntil(deadlineISO: string): number {
  if (!deadlineISO) return 1;
  const [y, m] = deadlineISO.split('-').map(Number);
  const now = new Date();
  const months = (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
  return Math.max(1, months);
}

function deadlineLabel(iso: string): string {
  if (!iso) return '—';
  const [y, m] = iso.split('-').map(Number);
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${labels[m - 1]} ${y}`;
}

export function GoalList() {
  const { goals, dispatch } = useFinanceData();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editValue, setEditValue] = useState('');

  if (goals.length === 0) {
    return (
      <div style={{ padding: '0 22px' }}>
        <EmptyState message="Nenhuma meta cadastrada. Defina metas para acompanhar seu progresso!" />
      </div>
    );
  }

  const totalAlvo = goals.reduce((s, g) => s + g.targetValue, 0) || 1;
  const totalAtual = goals.reduce((s, g) => s + g.currentValue, 0);
  const pctOverall = (totalAtual / totalAlvo) * 100;

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    dispatch({
      type: 'UPDATE_GOAL',
      payload: { id: selectedGoal.id, currentValue: parseMoney(editValue) },
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
      <div style={{ padding: '0 22px 12px' }}>
        <div
          className="card"
          style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: 22 }}
        >
          <Ring value={pctOverall} size={92} stroke={10} color="var(--accent)">
            <span style={{ fontSize: 14, color: 'var(--accent)' }}>{pctOverall.toFixed(0)}%</span>
          </Ring>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-overline" style={{ marginBottom: 6 }}>
              Progresso geral
            </div>
            <div style={{ marginBottom: 6 }}>
              <NumMono value={totalAtual} size={24} weight={500} color="var(--ink)" />
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink-mute)',
                fontFamily: 'var(--f-mono)',
              }}
            >
              de R$ {totalAlvo.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 12px', display: 'grid', gap: 10 }}>
        {goals.map((goal) => {
          const pct = goal.targetValue > 0 ? Math.min(100, (goal.currentValue / goal.targetValue) * 100) : 0;
          const remain = Math.max(0, goal.targetValue - goal.currentValue);
          const months = monthsUntil(goal.deadline);
          const hue = getEntityHue(goal);
          return (
            <div
              key={goal.id}
              className="card"
              style={{ padding: '18px 18px', cursor: 'pointer' }}
              onClick={() => {
                setSelectedGoal(goal);
                setEditValue(fmtMoneyInput(goal.currentValue.toFixed(2).replace('.', ',')));
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em' }}>
                    {goal.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span
                      className="pill"
                      style={{
                        color: `oklch(0.80 0.10 ${hue})`,
                        borderColor: `oklch(0.40 0.06 ${hue} / 0.6)`,
                        background: `oklch(0.24 0.04 ${hue} / 0.4)`,
                      }}
                    >
                      <span className="dot" style={{ background: `oklch(0.78 0.12 ${hue})` }} />
                      {GOAL_TYPE_LABELS[goal.type] || goal.type}
                    </span>
                    {goal.deadline && (
                      <span className="pill">{deadlineLabel(goal.deadline)}</span>
                    )}
                  </div>
                </div>
                <Ring value={pct} size={48} stroke={5} color={`oklch(0.78 0.11 ${hue})`}>
                  <span style={{ fontSize: 11, color: `oklch(0.85 0.10 ${hue})` }}>
                    {pct.toFixed(0)}%
                  </span>
                </Ring>
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <NumMono value={goal.currentValue} size={17} color="var(--ink)" weight={500} />
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-mute)',
                    fontFamily: 'var(--f-mono)',
                  }}
                >
                  de R$ {goal.targetValue.toLocaleString('pt-BR')}
                </span>
              </div>
              <div
                style={{
                  marginTop: 10,
                  height: 4,
                  borderRadius: 99,
                  background: 'var(--surface-2)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `oklch(0.78 0.11 ${hue})`,
                    transition: 'width 0.6s cubic-bezier(.2,.8,.2,1)',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <span>Faltam R$ {remain.toLocaleString('pt-BR')}</span>
                <span>+ R$ {Math.round(remain / months).toLocaleString('pt-BR')}/mês</span>
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
              type="text"
              inputMode="decimal"
              numeric
              value={editValue}
              onChange={(e) => setEditValue(fmtMoneyInput(e.target.value))}
            />
            <Button type="submit" variant="accent">
              Atualizar progresso
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setSelectedGoal(null)}
              className="mt-2"
            >
              Fechar
            </Button>
            <Button variant="danger" type="button" onClick={handleDelete} className="mt-2">
              Excluir meta
            </Button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
