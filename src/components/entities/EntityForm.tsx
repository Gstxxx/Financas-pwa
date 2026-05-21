'use client';

import { useMemo, useState } from 'react';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { HUE_PALETTE, getInitialGlyph, hashHue } from '@/lib/utils';
import type { Entity } from '@/lib/types';

interface EntityFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialEntity?: Entity;
}

export function EntityForm({ onClose, onSuccess, initialEntity }: EntityFormProps) {
  const { dispatch } = useFinanceData();
  const isEdit = !!initialEntity;
  const [name, setName] = useState(initialEntity?.name ?? '');
  const [hue, setHue] = useState<number>(
    initialEntity?.hue ?? hashHue(initialEntity?.name ?? '')
  );

  const previewHue = useMemo(() => hue || hashHue(name), [hue, name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isEdit && initialEntity) {
      dispatch({
        type: 'UPDATE_ENTITY',
        payload: { id: initialEntity.id, name: name.trim(), hue },
      });
    } else {
      dispatch({ type: 'ADD_ENTITY', payload: { name: name.trim(), hue } });
    }
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

      <div style={{ marginBottom: 16 }}>
        <label className="field-label">Cor</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {HUE_PALETTE.map((h) => {
            const active = h === hue;
            const glyph = getInitialGlyph(name);
            return (
              <button
                key={h}
                type="button"
                onClick={() => setHue(h)}
                aria-label={`Hue ${h}`}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `oklch(0.30 0.06 ${h})`,
                  border: `2px solid ${active ? 'var(--ink)' : `oklch(0.45 0.08 ${h} / 0.6)`}`,
                  color: `oklch(0.85 0.10 ${h})`,
                  fontFamily: 'var(--f-sans)',
                  fontWeight: glyph.isEmoji ? 400 : 600,
                  fontSize: glyph.isEmoji ? 18 : 15,
                  letterSpacing: glyph.isEmoji ? 0 : '-0.01em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.12s ease',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                }}
              >
                {glyph.value}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
          Selecionado: hue {previewHue}°
        </div>
      </div>

      <Button type="submit" variant="accent">
        {isEdit ? 'Salvar alterações' : 'Salvar categoria'}
      </Button>
      <Button variant="ghost" type="button" onClick={onClose} className="mt-2">
        Cancelar
      </Button>
    </form>
  );
}
