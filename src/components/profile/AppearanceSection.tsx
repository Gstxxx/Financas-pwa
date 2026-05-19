'use client';

import { useTheme, ACCENT_PREVIEW, ACCENTS, THEMES, type Theme, type Accent } from '@/lib/hooks/useTheme';
import { Seg } from '@/components/ui/Seg';

const THEME_LABELS: Record<Theme, string> = {
  warm: 'Warm',
  cream: 'Cream',
  noir: 'Noir',
};

const ACCENT_LABELS: Record<Accent, string> = {
  sage: 'Sage',
  amber: 'Amber',
  lilac: 'Lilac',
  sky: 'Sky',
};

export function AppearanceSection() {
  const { theme, accent, setTheme, setAccent } = useTheme();

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 18 }}>
          Aparência
        </h3>

        <label className="field-label">Tema</label>
        <Seg<Theme>
          value={theme}
          onChange={setTheme}
          options={THEMES.map((t) => ({ value: t, label: THEME_LABELS[t] }))}
          fullWidth
        />

        <label className="field-label" style={{ marginTop: 18 }}>
          Cor de destaque
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {ACCENTS.map((a) => {
            const active = a === accent;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                aria-label={ACCENT_LABELS[a]}
                title={ACCENT_LABELS[a]}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: ACCENT_PREVIEW[a],
                  border: active ? '2px solid var(--ink)' : '1px solid var(--hair)',
                  boxShadow: active
                    ? '0 0 0 3px var(--bg-elev), 0 0 0 4px var(--ink)'
                    : 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.12s ease, box-shadow 0.18s ease',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
