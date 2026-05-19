// Root app with state, screen routing, tabbar, sheets, tweaks

const { useState: useStateA, useEffect: useEffectA } = React;

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "warm",
  "accent": "oklch(0.78 0.12 145)",
  "fontDisplay": "Instrument Serif"
}/*EDITMODE-END*/;

function App() {
  const [tab, setTab] = useStateA('home');
  const [sub, setSub] = useStateA(null); // 'estatisticas' | 'metas' | null
  const [sheet, setSheet] = useStateA(null);
  const [t, setTweak] = useTweaks(DEFAULTS);

  function setTabAndReset(id) {
    setSub(null);
    setTab(id);
  }

  // FAB labels vary by view
  const fabs = (() => {
    if (sub === 'metas')      return [['Nova meta', 'light', () => setSheet('meta')]];
    if (sub === 'estatisticas') return [];
    if (tab === 'home')       return [['Adicionar conta', 'light', () => setSheet('conta')], ['Lançamento', 'accent', () => setSheet('lancamento')]];
    if (tab === 'contas')     return [['Nova conta', 'light', () => setSheet('conta')]];
    if (tab === 'categorias') return [['Nova categoria', 'light', () => setSheet('categoria')]];
    return [];
  })();

  const themeClass = `theme-${t.theme === 'cream' ? 'cream' : t.theme === 'noir' ? 'noir' : 'warm'}`;
  const displayFont = t.fontDisplay === 'Newsreader' ? 'Newsreader, serif'
                    : t.fontDisplay === 'Geist' ? 'Geist, sans-serif'
                    : 'Instrument Serif, serif';

  return (
    <div className={`app ${themeClass}`} style={{
      '--f-display': displayFont,
      '--accent': t.accent,
      '--accent-tint': `color-mix(in oklch, ${t.accent} 20%, transparent)`,
      '--accent-deep': `color-mix(in oklch, ${t.accent} 60%, black)`,
    }}>
      <div className="app-scroll" data-screen-label={sub ? sub.toUpperCase() : tab.toUpperCase()} key={sub || tab}>
        {sub === 'estatisticas' ? (
          <EstatisticasScreen goBack={() => setSub(null)}/>
        ) : sub === 'metas' ? (
          <MetasScreen goBack={() => setSub(null)} openSheet={setSheet}/>
        ) : (
          <>
            {tab === 'home'       && <HomeScreen openSheet={setSheet} goTo={setSub}/>}
            {tab === 'contas'     && <ContasScreen openSheet={setSheet}/>}
            {tab === 'categorias' && <CategoriasScreen openSheet={setSheet}/>}
            {tab === 'analise'    && <AnaliseScreen goTo={setSub}/>}
            {tab === 'perfil'     && <PerfilScreen/>}
          </>
        )}
      </div>

      {/* FAB pair */}
      {fabs.length > 0 && (
        <div className="fab-row">
          {fabs.map(([label, kind, onClick]) => (
            <button key={label} className={`fab fab-${kind === 'accent' ? 'accent' : 'light'}`} onClick={onClick}>
              {kind === 'accent' ? <I.arrowUp size={14} stroke={2}/> : <I.plus size={14} stroke={2}/>}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Tabbar */}
      <div className="tabbar">
        <div className="tabbar-inner">
          {[
            ['home',       'Home',       I.home],
            ['contas',     'Contas',     I.list],
            ['categorias', 'Categorias', I.folder],
            ['analise',    'Análise',    I.chart],
            ['perfil',     'Perfil',     I.gear],
          ].map(([id, label, Ico]) => (
            <button key={id} className={`tab ${tab === id && !sub ? 'active' : ''}`} onClick={() => setTabAndReset(id)}>
              <Ico size={19} color={tab === id ? 'var(--ink)' : 'var(--ink-mute)'}/>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sheets */}
      <NovaContaSheet      open={sheet === 'conta'}      onClose={() => setSheet(null)}/>
      <NovoLancamentoSheet open={sheet === 'lancamento'} onClose={() => setSheet(null)}/>
      <NovaCategoriaSheet  open={sheet === 'categoria'}  onClose={() => setSheet(null)}/>
      <SimularContaSheet   open={sheet === 'simular'}    onClose={() => setSheet(null)}/>
      <NovaMetaSheet       open={sheet === 'meta'}       onClose={() => setSheet(null)}/>

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio label="Surface" value={t.theme} onChange={v => setTweak('theme', v)}
            options={[
              { value: 'warm',  label: 'Warm' },
              { value: 'cream', label: 'Cream' },
              { value: 'noir',  label: 'Noir' },
            ]}/>
          <TweakColor label="Accent" value={t.accent} onChange={v => setTweak('accent', v)}
            options={[
              'oklch(0.78 0.12 145)',
              'oklch(0.82 0.13 80)',
              'oklch(0.76 0.10 295)',
              'oklch(0.80 0.10 220)',
              'oklch(0.74 0.14 25)',
            ]}/>
        </TweakSection>
        <TweakSection label="Typography">
          <TweakRadio label="Display" value={t.fontDisplay} onChange={v => setTweak('fontDisplay', v)}
            options={[
              { value: 'Instrument Serif', label: 'Serif' },
              { value: 'Newsreader',       label: 'News' },
              { value: 'Geist',            label: 'Sans' },
            ]}/>
        </TweakSection>
        <TweakSection label="Quick actions">
          <TweakButton label="Open: Nova conta"      onClick={() => setSheet('conta')}/>
          <TweakButton label="Open: Novo lançamento" onClick={() => setSheet('lancamento')}/>
          <TweakButton label="Open: Nova categoria"  onClick={() => setSheet('categoria')}/>
          <TweakButton label="Open: Simular conta"   onClick={() => setSheet('simular')}/>
          <TweakButton label="Open: Nova meta"       onClick={() => setSheet('meta')}/>
          <TweakButton label="Go: Estatísticas"      onClick={() => setSub('estatisticas')}/>
          <TweakButton label="Go: Metas"             onClick={() => setSub('metas')}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <IOSDevice width={402} height={874} dark={true}>
    <App/>
  </IOSDevice>
);
