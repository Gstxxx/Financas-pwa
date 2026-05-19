// All 5 screens

const { useState: useStateS, useMemo: useMemoS } = React;

/* ────────────────────────────────────────────────
   HOME — Suas finanças
   ──────────────────────────────────────────────── */
function HomeScreen({ openSheet, goTo }) {
  const [filter, setFilter] = useStateS('todas');
  const accounts = MOCK.ACCOUNTS;
  const balance = MOCK.TOTAL_IN - MOCK.TOTAL_OUT;
  const remaining = MOCK.REMAINING;

  const filtered = useMemoS(() => {
    if (filter === 'todas')    return accounts;
    if (filter === 'atrasado') return accounts.filter(a => a.status === 'atrasado');
    if (filter === 'vence')    return accounts.filter(a => a.status === 'vence');
    if (filter === 'em-dia')   return accounts.filter(a => a.status === 'em-dia');
    return accounts;
  }, [filter]);

  const counts = {
    todas: accounts.length,
    atrasado: accounts.filter(a => a.status === 'atrasado').length,
    vence: accounts.filter(a => a.status === 'vence').length,
    'em-dia': accounts.filter(a => a.status === 'em-dia').length,
  };

  return (
    <>
      <PageHead overline="Boa tarde · Mai 2026" title="Suas finanças"/>

      {/* Hero balance card */}
      <div style={{ padding: '0 22px' }}>
        <div className="card" style={{ padding: '22px 24px 24px', position: 'relative', overflow: 'hidden' }}>
          {/* subtle background flourish */}
          <div style={{
            position: 'absolute', right: -30, top: -50,
            width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in oklch, var(--accent) 14%, transparent), transparent 70%)',
            pointerEvents: 'none',
          }}/>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div className="t-overline">Saldo do ciclo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="live-dot"/>
              <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Ao vivo</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ color: balance < 0 ? 'var(--neg)' : 'var(--ink)' }}>
              <Money value={balance} size="xl"/>
            </div>
            <div style={{ flexShrink: 0, opacity: 0.9 }}>
              <Sparkline values={MOCK.RECENT_BALANCE} width={92} height={36}
                color={balance < 0 ? 'var(--neg)' : 'var(--accent)'}/>
              <div style={{ fontSize: 9.5, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right', marginTop: 2, fontFamily: 'var(--f-mono)' }}>
                5 ciclos
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: 'var(--neg)' }}/>
            <span style={{ fontSize: 13, color: 'var(--ink-mid)' }}>
              Faltam <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink)' }}>R$ {MOCK.fmt(remaining)}</span> a pagar este mês
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-mute)' }}>
            Projetado para fim do ciclo · <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-mid)' }}>−R$ {MOCK.fmt(MOCK.TOTAL_OUT - MOCK.TOTAL_IN)}</span>
          </div>
        </div>
      </div>

      {/* In/Out duo */}
      <div style={{ padding: '12px 22px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <I.arrowUp size={11} stroke={2} color="var(--accent)"/>
            <span className="t-overline">Entradas</span>
          </div>
          <div style={{ color: 'var(--accent)' }}>
            <NumMono value={MOCK.TOTAL_IN} sign="pos" size={20} weight={500}/>
          </div>
        </div>
        <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <I.arrowDown size={11} stroke={2} color="var(--neg)"/>
            <span className="t-overline">Saídas</span>
          </div>
          <div style={{ color: 'var(--neg)' }}>
            <NumMono value={MOCK.TOTAL_OUT} sign="neg" size={20} weight={500}/>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '10px 22px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <QuickAction onClick={() => goTo('estatisticas')} icon={<I.spark size={16} color="var(--cat-1)"/>} title="Estatísticas" sub="Tendências"/>
        <QuickAction onClick={() => goTo('metas')} icon={<I.target size={16} color="var(--accent)"/>} title="Metas" sub="Objetivos"/>
      </div>
      <div style={{ padding: '10px 22px 0' }}>
        <QuickAction onClick={() => openSheet('simular')} wide icon={<I.bolt size={16} color="var(--warn)"/>} title="Simular conta" sub="Veja se cabe no próximo mês" arrow/>
      </div>

      {/* Contas list */}
      <div className="section-label">
        <h2 className="t-h2">Contas</h2>
        <div className="line"/>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
          {filtered.length}/{accounts.length}
        </span>
      </div>

      <div style={{ padding: '0 22px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div className="seg" style={{ flexWrap: 'nowrap' }}>
          {[
            ['todas','Todas'],
            ['atrasado','Atrasado'],
            ['vence','Vence em breve'],
            ['em-dia','Em dia'],
          ].map(([id, label]) => (
            <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
              {label}<span className="count">{counts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.slice(0, 3).map(a => <AccountRow key={a.id} a={a} />)}
        </div>
      </div>

      <div className="month-marker">Junho 2026</div>

      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.slice(3).map(a => <AccountRow key={a.id} a={a} />)}
        </div>
      </div>
    </>
  );
}

function QuickAction({ icon, title, sub, arrow, wide, onClick }) {
  return (
    <div onClick={onClick} className="card-flat" style={{
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', transition: 'background 0.18s',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--surface)',
        border: '1px solid var(--hair)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 2 }}>{sub}</div>
      </div>
      {arrow && <I.chev size={14} color="var(--ink-mute)"/>}
    </div>
  );
}

/* ────────────────────────────────────────────────
   CONTAS — full list, grouped
   ──────────────────────────────────────────────── */
function ContasScreen({ openSheet }) {
  const [sort, setSort] = useStateS('venc');
  const sorted = useMemoS(() => {
    const arr = [...MOCK.ACCOUNTS];
    if (sort === 'venc')   arr.sort((a,b) => MOCK.dueDateOf(a) - MOCK.dueDateOf(b));
    if (sort === 'valor')  arr.sort((a,b) => b.amount - a.amount);
    if (sort === 'nome')   arr.sort((a,b) => a.name.localeCompare(b.name));
    return arr;
  }, [sort]);

  return (
    <>
      <PageHead overline={`${MOCK.ACCOUNTS.length} contas · Mai – Jun 2026`} title="Contas" right={
        <button className="btn btn-ghost" style={{ padding: '8px 10px' }}>
          <I.search size={16} color="var(--ink-mid)"/>
        </button>
      }/>

      {/* Calendar strip showing distribution of due dates */}
      <div style={{ padding: '0 22px 14px' }}>
        <div className="card-flat" style={{ padding: '14px 16px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div className="t-overline">Vencimentos em maio</div>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
              hoje <span style={{ color: 'var(--accent)' }}>18</span>
            </span>
          </div>
          <CalendarStrip today={18} marked={MOCK.DUE_BY_DAY} width={340} height={50}/>
        </div>
      </div>

      <div style={{ padding: '0 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="seg">
          {[['venc','Vencimento'],['valor','Valor'],['nome','Nome']].map(([id,l]) => (
            <button key={id} className={sort === id ? 'on' : ''} onClick={() => setSort(id)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ padding: '8px 10px' }}>
          <I.filter size={16} color="var(--ink-mid)"/>
        </button>
      </div>

      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {sorted.map(a => <AccountRow key={a.id} a={a} />)}
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────
   CATEGORIAS
   ──────────────────────────────────────────────── */
function CategoriasScreen({ openSheet }) {
  const cats = MOCK.CATEGORIES;
  const counts = useMemoS(() => {
    const c = {};
    for (const a of MOCK.ACCOUNTS) for (const k of a.cats) c[k] = (c[k] || 0) + 1;
    return c;
  }, []);
  const totals = useMemoS(() => {
    const c = {};
    for (const a of MOCK.ACCOUNTS) for (const k of a.cats) c[k] = (c[k] || 0) + a.amount;
    return c;
  }, []);

  return (
    <>
      <PageHead overline={`${cats.length} categorias`} title="Categorias" right={
        <button className="btn" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => openSheet('categoria')}>
          <I.plus size={13}/> Nova
        </button>
      }/>

      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {cats.map((c, i) => (
            <div key={c.id} style={{
              padding: '18px 20px',
              borderTop: i === 0 ? 'none' : '1px solid var(--hair-soft)',
              display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: `oklch(0.26 0.05 ${c.hue})`,
                border: `1px solid oklch(0.40 0.08 ${c.hue} / 0.5)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--f-display)',
                fontStyle: 'italic',
                fontSize: 18,
                color: `oklch(0.85 0.10 ${c.hue})`,
              }}>{c.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 3, fontFamily: 'var(--f-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {counts[c.id] || 0} {counts[c.id] === 1 ? 'conta' : 'contas'}
                </div>
                <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((totals[c.id] || 0) / MOCK.TOTAL_OUT) * 100)}%`,
                    background: `oklch(0.74 0.10 ${c.hue})`,
                    borderRadius: 99,
                  }}/>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <NumMono value={totals[c.id] || 0} size={14} sign="neg"/>
                <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 3, fontFamily: 'var(--f-mono)', letterSpacing: '0.05em' }}>
                  {((totals[c.id] || 0) / MOCK.TOTAL_OUT * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────
   ANÁLISE
   ──────────────────────────────────────────────── */
function AnaliseScreen({ goTo }) {
  const [month, setMonth] = useStateS(4); // May
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const usage = (MOCK.TOTAL_OUT / MOCK.TOTAL_IN * 100);

  return (
    <>
      <PageHead overline="Orçamento mensal" title="Análise"/>

      {/* Month switcher */}
      <div style={{ padding: '0 22px 16px' }}>
        <div className="card-flat" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
        }}>
          <button className="btn btn-ghost" style={{ padding: 8, border: '1px solid var(--hair)', borderRadius: 99, height: 34, width: 34, justifyContent: 'center' }}
                  onClick={() => setMonth(m => Math.max(0, m - 1))}>
            <I.chevL size={14} color="var(--ink-mid)"/>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-sans)', fontWeight: 500, fontSize: 17, letterSpacing: '-0.005em' }}>
              {months[month]} <span style={{ color: 'var(--ink-mute)', fontFamily: 'var(--f-mono)', fontWeight: 400, fontSize: 14 }}>2026</span>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: 8, border: '1px solid var(--hair)', borderRadius: 99, height: 34, width: 34, justifyContent: 'center' }}
                  onClick={() => setMonth(m => Math.min(11, m + 1))}>
            <I.chev size={14} color="var(--ink-mid)"/>
          </button>
        </div>
      </div>

      {/* 12-month trend */}
      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: '20px 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div className="t-overline">Despesas por mês · 2026</div>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>
              média <span style={{ color: 'var(--ink)' }}>R$ {MOCK.fmt(MOCK.HISTORY.reduce((s,m)=>s+m.out,0)/12)}</span>
            </span>
          </div>
          <Bars
            values={MOCK.HISTORY.map(m => m.out)}
            labels={MOCK.MONTHS_LABEL}
            highlight={MOCK.CURRENT_MONTH_IDX}
            width={340} height={130}
            color="var(--accent)"
          />
        </div>
      </div>

      {/* Receita / Despesas / Saldo trio */}
      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: '22px 22px 20px' }}>
          <div className="t-overline" style={{ marginBottom: 18 }}>Orçamento de {months[month]} 2026</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 22 }}>
            <Stat label="Receita"  value={MOCK.TOTAL_IN}  color="var(--accent)" sign="pos"/>
            <Stat label="Despesas" value={MOCK.TOTAL_OUT} color="var(--neg)"    sign="neg"/>
            <Stat label="Saldo"    value={MOCK.TOTAL_IN - MOCK.TOTAL_OUT} color="var(--ink)" sign="auto"/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            <span>Uso do orçamento</span>
            <span style={{ fontFamily: 'var(--f-mono)', color: usage > 100 ? 'var(--neg)' : 'var(--accent)' }}>{usage.toFixed(1)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              width: '100%',
              background: 'var(--surface-2)',
              position: 'absolute',
            }}/>
            <div style={{
              height: '100%',
              width: `${Math.min(100, usage)}%`,
              background: usage > 100 ? 'var(--neg)' : 'var(--accent)',
              borderRadius: 99,
              position: 'relative',
              zIndex: 1,
            }}/>
            {usage > 100 && (
              <div style={{
                position: 'absolute', right: 0, top: -1, bottom: -1, width: `${Math.min(100, usage - 100)}%`,
                background: 'repeating-linear-gradient(45deg, var(--neg), var(--neg) 3px, transparent 3px, transparent 6px)',
                opacity: 0.5,
              }}/>
            )}
          </div>
        </div>
      </div>

      {/* Despesas por categoria */}
      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: '22px 22px 14px' }}>
          <div className="t-overline" style={{ marginBottom: 18 }}>Despesas por categoria</div>

          <div className="cat-bar">
            {MOCK.BREAKDOWN.map((b, i) => {
              const c = MOCK.CATEGORIES.find(x => x.id === b.id);
              return <div key={b.id} style={{
                width: `${b.pct}%`,
                background: c ? `oklch(0.74 0.10 ${c.hue})` : 'var(--ink-mute)',
              }}/>;
            })}
          </div>

          {MOCK.BREAKDOWN.map((b, i) => {
            const c = MOCK.CATEGORIES.find(x => x.id === b.id);
            return (
              <div key={b.id} style={{
                display: 'grid',
                gridTemplateColumns: '14px 1fr auto 56px',
                gap: 12,
                alignItems: 'center',
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--hair-soft)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: c ? `oklch(0.74 0.10 ${c.hue})` : 'var(--ink-mute)' }}/>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{b.name}</div>
                <NumMono value={b.value} size={14} sign="neg" color="var(--ink-mid)"/>
                <div style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
                  {b.pct.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '0 22px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <QuickAction onClick={() => goTo && goTo('estatisticas')} icon={<I.spark size={16} color="var(--cat-1)"/>} title="Estatísticas" sub="Ver tendências" arrow/>
        <QuickAction onClick={() => goTo && goTo('metas')} icon={<I.target size={16} color="var(--accent)"/>} title="Metas" sub="Ver objetivos" arrow/>
      </div>
    </>
  );
}

function Stat({ label, value, color, sign }) {
  const auto = sign === 'auto';
  const s = auto ? (value < 0 ? 'neg' : value > 0 ? 'pos' : false) : sign;
  const finalColor = auto ? (value < 0 ? 'var(--neg)' : color) : color;
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: finalColor }}>
        <NumMono value={value} sign={s} size={17} weight={500}/>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   PERFIL
   ──────────────────────────────────────────────── */
function PerfilScreen() {
  return (
    <>
      <PageHead overline="Configurações" title="Perfil"/>

      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: '22px 22px 20px' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 500, letterSpacing: '-0.005em' }}>
            Configurações
          </h3>

          <Field label="Salário mensal (R$)" defaultValue="4.500,00"/>
          <Field label="Saldo atual (R$)" defaultValue="598,92" hint="Atualizado hoje, 14:32"/>
          <Field label="Orçamento mensal (R$)" defaultValue="4.500,00"/>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
            Salvar configurações
          </button>
        </div>
      </div>

      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 500, letterSpacing: '-0.005em' }}>
            Exportar / Importar
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn" style={{ justifyContent: 'center', padding: '14px 18px', background: 'var(--bg-elev)' }}>
              <I.download size={15} color="var(--ink-mid)"/> Exportar JSON
            </button>
            <button className="btn" style={{ justifyContent: 'center', padding: '14px 18px', background: 'var(--bg-elev)' }}>
              <I.upload size={15} color="var(--ink-mid)"/> Importar JSON
            </button>
          </div>
          <div style={{ marginTop: 18 }}>
            <Field label="Discord webhook URL" defaultValue="https://discord.com/api/webhooks/…"/>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: 'var(--bg-elev)' }}>
              <I.send size={14} color="var(--ink-mid)"/> Enviar para Discord
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 22px 14px' }}>
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 500, color: 'var(--neg)' }}>
            Zona de perigo
          </h3>
          <button className="btn" style={{
            width: '100%', justifyContent: 'center', padding: '14px',
            color: 'var(--neg)',
            borderColor: 'color-mix(in oklch, var(--neg) 40%, transparent)',
            background: 'color-mix(in oklch, var(--neg) 8%, transparent)',
          }}>
            Limpar todos os dados
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, defaultValue, hint, mono = true }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="field-label">{label}</label>
      <input className={`input ${mono ? 'num' : ''}`} defaultValue={defaultValue}/>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────
   ESTATÍSTICAS (sub-screen)
   ──────────────────────────────────────────────── */
function EstatisticasScreen({ goBack }) {
  const saved = MOCK.TOTAL_IN - MOCK.TOTAL_OUT;
  const savRate = (saved / MOCK.TOTAL_IN) * 100;
  const fixosPct = (MOCK.FIXOS_MENSAIS / MOCK.TOTAL_OUT) * 100;

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button className="btn btn-ghost" style={{ padding: 6, border: '1px solid var(--hair)', borderRadius: 99, height: 28, width: 28, justifyContent: 'center' }} onClick={goBack}>
              <I.chevL size={13} color="var(--ink-mid)"/>
            </button>
            <span className="t-overline">Visão detalhada</span>
          </div>
          <h1 className="t-h1">Estatísticas</h1>
        </div>
      </div>

      {/* Top KPI duo */}
      <div style={{ padding: '0 22px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
          <div className="t-overline" style={{ marginBottom: 10 }}>Total em dívidas</div>
          <div style={{ color: 'var(--neg)' }}>
            <NumMono value={MOCK.TOTAL_EM_DIVIDAS} sign="neg" size={18} weight={500}/>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline values={MOCK.HISTORY.map(m=>m.out)} width={132} height={22} color="var(--neg)" fill={true} last={false}/>
          </div>
        </div>
        <div className="card-flat" style={{ padding: '16px 16px 14px' }}>
          <div className="t-overline" style={{ marginBottom: 10 }}>Total pago em 2026</div>
          <div style={{ color: 'var(--accent)' }}>
            <NumMono value={MOCK.TOTAL_PAGO} sign="pos" size={18} weight={500}/>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline values={MOCK.HISTORY.slice(0, MOCK.CURRENT_MONTH_IDX+1).map(m=>m.out)} width={132} height={22} color="var(--accent)" fill={true} last={false}/>
          </div>
        </div>
      </div>

      {/* Fixos mensais */}
      <div style={{ padding: '0 22px 12px' }}>
        <div className="card-flat" style={{ padding: '16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="t-overline" style={{ marginBottom: 10 }}>Fixos mensais</div>
              <div style={{ color: 'var(--ink)' }}>
                <NumMono value={MOCK.FIXOS_MENSAIS} sign="neg" size={18} weight={500}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 6, fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
                {MOCK.FIXOS_COUNT} contas recorrentes · {fixosPct.toFixed(0)}% das saídas
              </div>
            </div>
            <Ring value={fixosPct} size={56} stroke={6} color="var(--cat-1)">
              <span style={{ fontSize: 12, color: 'var(--cat-1)' }}>{fixosPct.toFixed(0)}%</span>
            </Ring>
          </div>
        </div>
      </div>

      {/* Trend bars */}
      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ padding: '20px 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div className="t-overline">Tendência 2026</div>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
              MÊS ATUAL EM DESTAQUE
            </span>
          </div>
          <Bars
            values={MOCK.HISTORY.map(m=>m.out)}
            labels={MOCK.MONTHS_LABEL}
            highlight={MOCK.CURRENT_MONTH_IDX}
            width={340} height={140}
            color="var(--accent)"
          />
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, color: 'var(--ink-mute)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }}/>Mês atual
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--surface-2)' }}/>Demais
            </span>
          </div>
        </div>
      </div>

      {/* Taxa de poupança */}
      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ padding: '22px' }}>
          <div className="t-overline" style={{ marginBottom: 14 }}>Taxa de poupança</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Ring value={Math.abs(savRate)} max={100} size={84} stroke={9}
                  color={savRate < 0 ? 'var(--neg)' : 'var(--accent)'}>
              <span style={{ fontSize: 13, color: savRate < 0 ? 'var(--neg)' : 'var(--accent)' }}>
                {savRate.toFixed(0)}%
              </span>
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 36, fontStyle: 'italic',
                            color: savRate < 0 ? 'var(--neg)' : 'var(--accent)',
                            letterSpacing: '-0.02em', lineHeight: 1 }}>
                {savRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 8, fontFamily: 'var(--f-mono)' }}>
                <NumMono value={Math.abs(saved)} sign={saved < 0 ? 'neg' : 'pos'} size={12} color={savRate < 0 ? 'var(--neg)' : 'var(--accent)'}/> por mês
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 10, lineHeight: 1.5 }}>
                {savRate < 0
                  ? 'Atenção: despesas excedem a receita este mês.'
                  : 'Você está poupando acima do recomendado.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top categories donut */}
      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ padding: '22px' }}>
          <div className="t-overline" style={{ marginBottom: 18 }}>Distribuição das saídas</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Donut size={128} stroke={18}
              slices={MOCK.BREAKDOWN.map(b => {
                const c = MOCK.CATEGORIES.find(x => x.id === b.id);
                return { value: b.value, color: c ? `oklch(0.74 0.10 ${c.hue})` : 'var(--ink-mute)' };
              })}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Total</div>
              <div style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)', marginTop: 2 }}>
                R$ {Math.round(MOCK.TOTAL_OUT).toLocaleString('pt-BR')}
              </div>
            </Donut>
            <div style={{ flex: 1, display: 'grid', gap: 8 }}>
              {MOCK.BREAKDOWN.slice(0, 5).map(b => {
                const c = MOCK.CATEGORIES.find(x => x.id === b.id);
                return (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: c ? `oklch(0.74 0.10 ${c.hue})` : 'var(--ink-mute)' }}/>
                    <span style={{ fontSize: 12 }}>{b.name}</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--ink-faint)' }}>
                      {b.pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────
   METAS (sub-screen)
   ──────────────────────────────────────────────── */
function MetasScreen({ goBack, openSheet }) {
  const totalAlvo = MOCK.METAS.reduce((s, m) => s + m.target, 0);
  const totalAtual = MOCK.METAS.reduce((s, m) => s + m.current, 0);
  const pctOverall = (totalAtual / totalAlvo) * 100;

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button className="btn btn-ghost" style={{ padding: 6, border: '1px solid var(--hair)', borderRadius: 99, height: 28, width: 28, justifyContent: 'center' }} onClick={goBack}>
              <I.chevL size={13} color="var(--ink-mid)"/>
            </button>
            <span className="t-overline">{MOCK.METAS.length} metas · objetivos</span>
          </div>
          <h1 className="t-h1">Metas</h1>
        </div>
      </div>

      {/* Overall ring */}
      <div style={{ padding: '0 22px 12px' }}>
        <div className="card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: 22 }}>
          <Ring value={pctOverall} size={92} stroke={10} color="var(--accent)">
            <span style={{ fontSize: 14, color: 'var(--accent)' }}>{pctOverall.toFixed(0)}%</span>
          </Ring>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-overline" style={{ marginBottom: 6 }}>Progresso geral</div>
            <div style={{ marginBottom: 6 }}>
              <NumMono value={totalAtual} size={24} weight={500} color="var(--ink)"/>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', fontFamily: 'var(--f-mono)' }}>
              de R$ {totalAlvo.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* Goals list */}
      <div style={{ padding: '0 22px 12px', display: 'grid', gap: 10 }}>
        {MOCK.METAS.map(m => {
          const pct = Math.min(100, (m.current / m.target) * 100);
          const remain = Math.max(0, m.target - m.current);
          return (
            <div key={m.id} className="card" style={{ padding: '18px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em' }}>{m.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <span className="pill" style={{
                      color: `oklch(0.80 0.10 ${m.hue})`,
                      borderColor: `oklch(0.40 0.06 ${m.hue} / 0.6)`,
                      background: `oklch(0.24 0.04 ${m.hue} / 0.4)`,
                    }}>
                      <span className="dot" style={{ background: `oklch(0.78 0.12 ${m.hue})` }}/>
                      {m.tipo}
                    </span>
                    <span className="pill">{m.prazo}</span>
                  </div>
                </div>
                <Ring value={pct} size={48} stroke={5} color={`oklch(0.78 0.11 ${m.hue})`}>
                  <span style={{ fontSize: 11, color: `oklch(0.85 0.10 ${m.hue})` }}>{pct.toFixed(0)}%</span>
                </Ring>
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <NumMono value={m.current} size={17} color="var(--ink)" weight={500}/>
                <span style={{ fontSize: 12, color: 'var(--ink-mute)', fontFamily: 'var(--f-mono)' }}>
                  de R$ {m.target.toLocaleString('pt-BR')}
                </span>
              </div>

              <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `oklch(0.78 0.11 ${m.hue})` }}/>
              </div>

              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--f-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <span>Faltam R$ {remain.toLocaleString('pt-BR')}</span>
                <span>+ R$ {Math.round(remain / 6).toLocaleString('pt-BR')}/mês p/ atingir</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

Object.assign(window, { HomeScreen, ContasScreen, CategoriasScreen, AnaliseScreen, PerfilScreen, EstatisticasScreen, MetasScreen });
