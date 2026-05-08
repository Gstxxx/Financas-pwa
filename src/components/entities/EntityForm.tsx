'use client';

import { useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EntityFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function EntityForm({ onClose, onSuccess }: EntityFormProps) {
  const { dispatch } = useFinanceData();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'ADD_ENTITY', payload: { name: name.trim() } });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Nome da categoria"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Ex: Moradia"
        maxLength={40}
        autoComplete="off"
      />
      <Button type="submit">Salvar categoria</Button>
      <Button variant="ghost" type="button" onClick={onClose}>
        Cancelar
      </Button>
    </form>
  );
}
