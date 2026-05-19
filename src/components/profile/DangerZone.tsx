'use client';

import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Button } from '@/components/ui/Button';

interface DangerZoneProps {
  onToast: (msg: string) => void;
}

export function DangerZone({ onToast }: DangerZoneProps) {
  const { dispatch } = useFinanceData();

  const handleReset = () => {
    if (window.confirm('Apagar TODOS os dados?\n\nEsta ação não pode ser desfeita.')) {
      dispatch({ type: 'RESET_ALL' });
      onToast('Dados resetados.');
    }
  };

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 10, color: 'var(--neg)' }}>
          Zona de perigo
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 16 }}>
          Apagar todos os dados permanentemente. Esta ação não pode ser desfeita.
        </p>
        <Button variant="danger" onClick={handleReset} type="button">
          Resetar todos os dados
        </Button>
      </div>
    </div>
  );
}
