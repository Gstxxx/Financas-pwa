'use client';

const SHORTCUTS: { combo: string; label: string }[] = [
  { combo: 'Ctrl + 1', label: 'Início' },
  { combo: 'Ctrl + 2', label: 'Contas' },
  { combo: 'Ctrl + 3', label: 'Carteiras' },
  { combo: 'Ctrl + 4', label: 'Categorias' },
  { combo: 'Ctrl + 5', label: 'Metas' },
  { combo: 'Ctrl + 6', label: 'Análise' },
  { combo: 'Ctrl + 7', label: 'Estatísticas' },
  { combo: 'Ctrl + 8', label: 'Perfil' },
  { combo: 'Ctrl + 9', label: 'Chat (IA)' },
  { combo: 'Ctrl + 0', label: 'Open Finance (banco)' },
  { combo: 'Ctrl + N', label: 'Nova conta' },
  { combo: 'Ctrl + G', label: 'Nova meta' },
  { combo: 'Ctrl + I', label: 'Novo lançamento' },
  { combo: 'Esc', label: 'Fechar formulário' },
];

export function ShortcutsSection() {
  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 className="t-h3" style={{ marginBottom: 12 }}>
          Atalhos de teclado
        </h3>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--ink-mute)',
            marginTop: 0,
            marginBottom: 14,
          }}
        >
          Atalhos não disparam enquanto você está digitando em um campo.
        </p>
        <div>
          {SHORTCUTS.map((s, i) => (
            <div
              key={s.combo}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--hair-soft)',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--ink-mid)' }}>{s.label}</span>
              <kbd
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11.5,
                  color: 'var(--ink-mid)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--hair)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  letterSpacing: '0.02em',
                }}
              >
                {s.combo}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
