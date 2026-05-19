'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { HUE_PALETTE, getTodayISO, hashHue, parseMoney } from '@/lib/utils';

interface GoalFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function GoalForm({ onClose, onSuccess }: GoalFormProps) {
  const { dispatch } = useFinanceData();
  const [name, setName] = useState('');
  const [type, setType] = useState<'savings' | 'emergency' | 'debt-free' | 'custom'>('savings');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [hue, setHue] = useState<number>(HUE_PALETTE[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({
      type: 'ADD_GOAL',
      payload: {
        name: name.trim(),
        type,
        targetValue: parseMoney(targetValue),
        currentValue: parseMoney(currentValue),
        deadline: deadline || getTodayISO(),
        hue: hue || hashHue(name),
      },
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Nome da meta"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Ex: Reserva de emergência"
        maxLength={60}
      />
      <Select
        label="Tipo"
        value={type}
        onChange={(e) => setType(e.target.value as typeof type)}
        options={[
          { value: 'savings', label: 'Poupança' },
          { value: 'emergency', label: 'Reserva emergência' },
          { value: 'debt-free', label: 'Quitar dívidas' },
          { value: 'custom', label: 'Personalizada' },
        ]}
      />
      <Input
        label="Valor alvo (R$)"
        type="text"
        inputMode="decimal"
        numeric
        value={targetValue}
        onChange={(e) => setTargetValue(e.target.value)}
        required
        placeholder="10000"
      />
      <Input
        label="Valor atual (R$)"
        type="text"
        inputMode="decimal"
        numeric
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
      />
      <Input
        label="Prazo"
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />
      <div style={{ marginBottom: 16 }}>
        <label className="field-label">Cor</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {HUE_PALETTE.map((h) => {
            const active = h === hue;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setHue(h)}
                aria-label={`Hue ${h}`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: `oklch(0.30 0.06 ${h})`,
                  border: `2px solid ${active ? 'var(--ink)' : `oklch(0.45 0.08 ${h} / 0.6)`}`,
                  cursor: 'pointer',
                  transition: 'transform 0.12s ease',
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>
      </div>
      <Button type="submit" variant="accent">
        Salvar meta
      </Button>
      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Cancelar
      </Button>
    </form>
  );
}
