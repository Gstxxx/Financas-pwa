'use client';

import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Button } from '@/components/ui/Button';

interface DangerZoneProps {
  onToast: (msg: string) => void;
}

export function DangerZone({ onToast }: DangerZoneProps) {
  const { dispatch } = useFinanceData();

  const handleReset = () => {
    if (window.confirm('Apagar TODOS os dados?\n\nEsta acao nao pode ser desfeita.')) {
      dispatch({ type: 'RESET_ALL' });
      onToast('Dados resetados.');
    }
  };

  return (
    <div className="bg-surface border border-critical/20 rounded-[18px] p-5">
      <h3 className="font-display text-lg font-semibold mb-2 text-critical">Zona de perigo</h3>
      <p className="text-sm text-text-3 mb-4">
        Apagar todos os dados permanentemente. Esta acao nao pode ser desfeita.
      </p>
      <Button variant="danger" onClick={handleReset}>
        Resetar todos os dados
      </Button>
    </div>
  );
}
