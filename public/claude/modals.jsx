// Bottom-sheet modals

const { useState: useStateM } = React;

function Sheet({ open, onClose, title, children }) {
  return (
    <>
      <div className={`sheet-overlay ${open ? 'open' : ''}`} onClick={onClose}/>
      <div className={`sheet ${open ? 'open' : ''}`}>
        <div className="sheet-grabber"/>
        <div className="sheet-head">
          <div>
            <h2 className="t-h2" style={{ fontSize: 26 }}>{title}</h2>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Fechar">
            <I.close size={15} color="var(--ink-mid)"/>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────
   Nova conta
   ──────────────────────────────────────────────── */
function NovaContaSheet({ open, onClose }) {
  const [name, setName] = useStateM('');
  const [valor, setValor] = useStateM('');
  const [parcelas, setParcelas] = useStateM('0');
  const [dia, setDia] = useStateM('10');
  const [mes, setMes] = useStateM('5');
  const [ano, setAno] = useStateM('2026');
  const [picked, setPicked] = useStateM(new Set());

  function togglePick(id) {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nova conta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div>
          <label className="field-label">Nome da conta</label>
          <input className="input" placeholder="Ex: Aluguel" value={name} onChange={e => setName(e.target.value)}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">Valor (R$)</label>
            <input className="input num" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)}/>
          </div>
          <div>
            <label className="field-label">Parcelas</label>
            <input className="input num" value={parcelas} onChange={e => setParcelas(e.target.value)}/>
            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 6, letterSpacing: '0.04em' }}>
              0 = fixo / recorrente
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">Dia</label>
            <input className="input num" value={dia} onChange={e => setDia(e.target.value)}/>
          </div>
          <div>
            <label className="field-label">Mês</label>
            <input className="input num" value={mes} onChange={e => setMes(e.target.value)}/>
          </div>
          <div>
            <label className="field-label">Ano</label>
            <input className="input num" value={ano} onChange={e => setAno(e.target.value)}/>
          </div>
        </div>

        <div>
          <label className="field-label">Categorias</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {MOCK.CATEGORIES.map(c => {
              const on = picked.has(c.id);
              return (
                <button key={c.id} onClick={() => togglePick(c.id)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 99,
                  border: `1px solid ${on ? `oklch(0.65 0.10 ${c.hue})` : 'var(--hair)'}`,
                  background: on ? `oklch(0.30 0.07 ${c.hue})` : 'transparent',
                  color: on ? `oklch(0.90 0.08 ${c.hue})` : 'var(--ink-mid)',
                  fontFamily: 'var(--f-sans)', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: `oklch(0.78 0.12 ${c.hue})` }}/>
                  {c.name}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 10 }}>
            {picked.size === 0 ? 'Sem categoria selecionada' : `${picked.size} ${picked.size === 1 ? 'categoria selecionada' : 'categorias selecionadas'}`}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '15px' }} onClick={onClose}>
            Salvar conta
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '15px', border: 'none' }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ────────────────────────────────────────────────
   Novo lançamento
   ──────────────────────────────────────────────── */
function NovoLancamentoSheet({ open, onClose }) {
  const [tipo, setTipo] = useStateM('entrada');
  const [desc, setDesc] = useStateM('');
  const [valor, setValor] = useStateM('');
  const [data, setData] = useStateM('2026-05-18');

  return (
    <Sheet open={open} onClose={onClose} title="Novo lançamento">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="field-label">Tipo</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => setTipo('entrada')} style={tipoBtn(tipo === 'entrada', 'pos')}>
              <I.arrowUp size={14} stroke={2}/> Entrada
            </button>
            <button onClick={() => setTipo('saida')} style={tipoBtn(tipo === 'saida', 'neg')}>
              <I.arrowDown size={14} stroke={2}/> PIX / Saída
            </button>
          </div>
        </div>

        <div>
          <label className="field-label">Descrição</label>
          <input className="input" placeholder="Ex: Freela design" value={desc} onChange={e => setDesc(e.target.value)}/>
        </div>

        <div>
          <label className="field-label">Valor (R$)</label>
          <input className="input num" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} style={{ fontSize: 22, fontFamily: 'var(--f-mono)' }}/>
        </div>

        <div>
          <label className="field-label">Data</label>
          <input className="input num" type="date" value={data} onChange={e => setData(e.target.value)}/>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <button className={tipo === 'entrada' ? 'btn btn-accent' : 'btn btn-primary'} style={{ justifyContent: 'center', padding: '15px' }} onClick={onClose}>
            Salvar {tipo}
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '15px', border: 'none' }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function tipoBtn(on, tone) {
  const c = tone === 'pos' ? 'var(--accent)' : 'var(--neg)';
  const tint = tone === 'pos' ? 'var(--accent-tint)' : 'var(--neg-tint)';
  return {
    height: 48,
    borderRadius: 99,
    border: `1px solid ${on ? c : 'var(--hair)'}`,
    background: on ? tint : 'transparent',
    color: on ? c : 'var(--ink-mid)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--f-sans)',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.18s',
  };
}

/* ────────────────────────────────────────────────
   Nova categoria
   ──────────────────────────────────────────────── */
function NovaCategoriaSheet({ open, onClose }) {
  const [name, setName] = useStateM('');
  const [hue, setHue] = useStateM(145);

  const swatches = [145, 25, 65, 200, 285, 335, 195, 350];

  return (
    <Sheet open={open} onClose={onClose} title="Nova categoria">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="field-label">Nome da categoria</label>
          <input className="input" placeholder="Ex: Moradia" value={name} onChange={e => setName(e.target.value)}/>
        </div>

        <div>
          <label className="field-label">Cor</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {swatches.map(h => (
              <button key={h} onClick={() => setHue(h)} style={{
                width: 32, height: 32, borderRadius: 12,
                background: `oklch(0.78 0.12 ${h})`,
                border: hue === h ? '2px solid var(--ink)' : '1px solid var(--hair)',
                cursor: 'pointer',
                boxShadow: hue === h ? '0 0 0 4px var(--bg-elev), 0 0 0 5px var(--ink)' : 'none',
              }}/>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 14,
          background: `oklch(0.24 0.04 ${hue} / 0.5)`,
          border: `1px solid oklch(0.40 0.06 ${hue} / 0.5)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `oklch(0.30 0.06 ${hue})`,
            border: `1px solid oklch(0.45 0.08 ${hue} / 0.6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-display)', fontStyle: 'italic',
            color: `oklch(0.85 0.10 ${hue})`,
          }}>{(name[0] || 'A').toUpperCase()}</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: `oklch(0.92 0.05 ${hue})` }}>
            {name || 'Pré-visualização'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '15px' }} onClick={onClose}>
            Salvar categoria
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '15px', border: 'none' }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ────────────────────────────────────────────────
   Simular conta no próximo mês
   ──────────────────────────────────────────────── */
function SimularContaSheet({ open, onClose }) {
  const [valor, setValor] = useStateM('');

  const v = parseFloat((valor || '0').toString().replace(/\./g,'').replace(',','.')) || 0;
  const ran = v > 0;

  // Projection for June 2026
  const receitaPrevista = MOCK.TOTAL_IN;
  const saidasAgendadas = MOCK.ACCOUNTS.filter(a => a.month === 5).reduce((s,a) => s+a.amount, 0);
  const saldoAntes = receitaPrevista - saidasAgendadas;
  const saldoApos = saldoAntes - v;
  const margem = receitaPrevista > 0 ? (saldoApos / receitaPrevista) * 100 : 0;
  const ok = saldoApos >= 0;

  return (
    <Sheet open={open} onClose={onClose} title="Simular conta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div>
          <label className="field-label">Valor da conta (R$)</label>
          <input className="input num" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)}
                 style={{ fontSize: 22 }}/>
        </div>

        {ran && (
          <>
            {/* Verdict card */}
            <div style={{
              padding: '16px 18px',
              borderRadius: 14,
              background: ok ? 'color-mix(in oklch, var(--accent) 14%, transparent)' : 'color-mix(in oklch, var(--neg) 14%, transparent)',
              border: `1px solid ${ok ? 'color-mix(in oklch, var(--accent) 40%, transparent)' : 'color-mix(in oklch, var(--neg) 40%, transparent)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ring value={Math.max(0, Math.min(100, margem))} size={42} stroke={4}
                      color={ok ? 'var(--accent)' : 'var(--neg)'}>
                  <span style={{ fontSize: 11, color: ok ? 'var(--accent)' : 'var(--neg)' }}>
                    {margem.toFixed(0)}%
                  </span>
                </Ring>
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontSize: 19, color: ok ? 'var(--accent)' : 'var(--neg)' }}>
                    {ok ? 'Cabe no orçamento' : 'Prejudica o orçamento'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-mid)', marginTop: 4 }}>
                    {ok
                      ? `Sobrariam R$ ${MOCK.fmt(saldoApos)} ao fim de junho`
                      : `Estouro de R$ ${MOCK.fmt(-saldoApos)} no fim do ciclo`}
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked bar visualizing impact */}
            <div>
              <div className="t-overline" style={{ marginBottom: 12 }}>Projeção para junho 2026</div>
              <StackedBar items={[
                { value: saidasAgendadas, color: 'var(--ink-mute)' },
                { value: v,               color: ok ? 'var(--accent)' : 'var(--neg)' },
                { value: Math.max(0, saldoApos), color: 'var(--surface-2)' },
              ]} height={10}/>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, color: 'var(--ink-mute)' }}>
                <Legend dot="var(--ink-mute)" label="Agendado"/>
                <Legend dot={ok ? 'var(--accent)' : 'var(--neg)'} label="Nova conta"/>
                <Legend dot="var(--surface-2)" label="Sobra"/>
              </div>
            </div>

            {/* Detailed breakdown */}
            <div className="card-flat" style={{ padding: '6px 16px' }}>
              <ProjRow label="Receita prevista" value={receitaPrevista} sign="pos" color="var(--accent)"/>
              <ProjRow label="Saídas já agendadas" value={saidasAgendadas} sign="neg" color="var(--ink)"/>
              <ProjRow label="Saldo antes da conta" value={saldoAntes} sign={saldoAntes < 0 ? 'neg' : 'pos'} color={saldoAntes < 0 ? 'var(--neg)' : 'var(--accent)'}/>
              <ProjRow label="Conta hipotética" value={v} sign="neg" color="var(--ink)"/>
              <ProjRow label="Saldo após a conta" value={Math.abs(saldoApos)} sign={saldoApos < 0 ? 'neg' : 'pos'} color={saldoApos < 0 ? 'var(--neg)' : 'var(--accent)'} bold/>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                padding: '12px 0',
                borderTop: '1px solid var(--hair-soft)',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--ink-mid)' }}>Margem sobre receita</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: ok ? 'var(--accent)' : 'var(--neg)' }}>
                  {margem.toFixed(1)}%
                </span>
              </div>
            </div>
          </>
        )}

        {!ran && (
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '15px' }} onClick={() => {}}>
            Simular impacto
          </button>
        )}

        <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '15px', border: '1px solid var(--hair)' }} onClick={onClose}>
          Fechar
        </button>
      </div>
    </Sheet>
  );
}

function ProjRow({ label, value, sign, color, bold }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto',
      padding: '12px 0',
      borderBottom: '1px solid var(--hair-soft)',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, color: 'var(--ink-mid)', fontWeight: bold ? 500 : 400 }}>{label}</span>
      <NumMono value={value} sign={sign} size={bold ? 16 : 14} color={color} weight={bold ? 500 : 400}/>
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: dot }}/>
      {label}
    </span>
  );
}

/* ────────────────────────────────────────────────
   Nova meta
   ──────────────────────────────────────────────── */
function NovaMetaSheet({ open, onClose }) {
  const [name, setName] = useStateM('');
  const [tipo, setTipo] = useStateM('poupanca');
  const [alvo, setAlvo] = useStateM('');
  const [atual, setAtual] = useStateM('0');
  const [prazo, setPrazo] = useStateM('2026-12-31');
  const [hue, setHue] = useStateM(290);
  const swatches = [145, 25, 65, 200, 290, 335];

  const tipos = [['poupanca','Poupança'],['compra','Compra'],['quitacao','Quitação']];
  const av = parseFloat((alvo || '0').replace(',','.')) || 0;
  const cv = parseFloat((atual || '0').replace(',','.')) || 0;
  const pct = av > 0 ? Math.min(100, (cv/av)*100) : 0;

  return (
    <Sheet open={open} onClose={onClose} title="Nova meta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Live preview */}
        <div className="card-flat" style={{ padding: '18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring value={pct} size={56} stroke={6}
                  color={`oklch(0.78 0.11 ${hue})`}>
              <span style={{ fontSize: 12, color: `oklch(0.85 0.10 ${hue})` }}>
                {pct.toFixed(0)}%
              </span>
            </Ring>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>
                {name || 'Sua nova meta'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--f-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {tipos.find(([k]) => k === tipo)[1]} · meta de R$ {av ? MOCK.fmt(av) : '0,00'}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Nome da meta</label>
          <input className="input" placeholder="Ex: Reserva de emergência" value={name} onChange={e => setName(e.target.value)}/>
        </div>

        <div>
          <label className="field-label">Tipo</label>
          <div className="seg" style={{ width: '100%' }}>
            {tipos.map(([k, l]) => (
              <button key={k} className={tipo === k ? 'on' : ''} onClick={() => setTipo(k)} style={{ flex: 1 }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">Valor alvo</label>
            <input className="input num" placeholder="0,00" value={alvo} onChange={e => setAlvo(e.target.value)}/>
          </div>
          <div>
            <label className="field-label">Valor atual</label>
            <input className="input num" placeholder="0,00" value={atual} onChange={e => setAtual(e.target.value)}/>
          </div>
        </div>

        <div>
          <label className="field-label">Prazo</label>
          <input className="input num" type="date" value={prazo} onChange={e => setPrazo(e.target.value)}/>
        </div>

        <div>
          <label className="field-label">Cor</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {swatches.map(h => (
              <button key={h} onClick={() => setHue(h)} style={{
                width: 32, height: 32, borderRadius: 12,
                background: `oklch(0.78 0.11 ${h})`,
                border: hue === h ? '2px solid var(--ink)' : '1px solid var(--hair)',
                cursor: 'pointer',
                boxShadow: hue === h ? '0 0 0 4px var(--bg-elev), 0 0 0 5px var(--ink)' : 'none',
              }}/>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '15px' }} onClick={onClose}>
            Salvar meta
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'center', padding: '15px', border: 'none' }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </Sheet>
  );
}

Object.assign(window, { NovaContaSheet, NovoLancamentoSheet, NovaCategoriaSheet, SimularContaSheet, NovaMetaSheet });
