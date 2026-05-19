// Mock data for Contas prototype

window.MOCK = (() => {
  const CATEGORIES = [
    { id: 'servicos',    name: 'Serviços',    hue: 220, icon: 'box' },
    { id: 'fixo',        name: 'Fixo',        hue: 145, icon: 'pin' },
    { id: 'parcelado',   name: 'Parcelado',   hue: 65,  icon: 'split' },
    { id: 'familia',     name: 'Família',     hue: 25,  icon: 'home' },
    { id: 'pai',         name: 'Pai',         hue: 350, icon: 'heart' },
    { id: 'amor',        name: 'Amor',        hue: 335, icon: 'heart' },
    { id: 'funcionarios',name: 'Funcionários',hue: 285, icon: 'people' },
    { id: 'outros',      name: 'Outros',      hue: 195, icon: 'dot' },
  ];

  const ACCOUNTS = [
    { id: 1, name: 'Internet',     amount: 160.00, dueDay: 27, month: 4, year: 2026, status: 'em-dia',   cats: ['servicos','fixo'] },
    { id: 2, name: 'Youtube',      amount: 56.00,  dueDay: 27, month: 4, year: 2026, status: 'em-dia',   cats: ['servicos','fixo'] },
    { id: 3, name: 'Picpay',       amount: 1100.00,dueDay: 28, month: 4, year: 2026, status: 'em-dia',   cats: ['parcelado'], parcela: { current: 2, total: 5 } },
    { id: 4, name: 'Claude',       amount: 500.00, dueDay: 4,  month: 5, year: 2026, status: 'em-dia',   cats: ['servicos','fixo'] },
    { id: 5, name: 'Funcionários', amount: 150.00, dueDay: 5,  month: 5, year: 2026, status: 'em-dia',   cats: ['funcionarios','fixo'] },
    { id: 6, name: 'Mega da Mãe',  amount: 308.00, dueDay: 5,  month: 5, year: 2026, status: 'em-dia',   cats: ['parcelado','familia'], parcela: { current: 3, total: 6 } },
    { id: 7, name: 'Linha',        amount: 185.00, dueDay: 10, month: 5, year: 2026, status: 'em-dia',   cats: ['servicos','fixo'] },
    { id: 8, name: 'Cartão Pai 4x',amount: 208.00, dueDay: 10, month: 5, year: 2026, status: 'em-dia',   cats: ['pai','parcelado'], parcela: { current: 3, total: 4 } },
    { id: 9, name: 'Dentista',     amount: 341.25, dueDay: 10, month: 5, year: 2026, status: 'em-dia',   cats: ['parcelado','servicos'], parcela: { current: 2, total: 6 } },
    { id: 10,name: 'Apartamento',  amount: 1400.00,dueDay: 15, month: 5, year: 2026, status: 'vence',    cats: ['fixo','familia'] },
    { id: 11,name: 'Energia',      amount: 245.50, dueDay: 18, month: 5, year: 2026, status: 'em-dia',   cats: ['fixo','servicos'] },
    { id: 12,name: 'Cartão Amor',  amount: 420.00, dueDay: 22, month: 5, year: 2026, status: 'em-dia',   cats: ['amor','parcelado'], parcela: { current: 2, total: 3 } },
    { id: 13,name: 'Padaria mês',  amount: 87.30,  dueDay: 25, month: 5, year: 2026, status: 'em-dia',   cats: ['outros'] },
  ];

  // Totals + summary
  const TOTAL_OUT = ACCOUNTS.reduce((s, a) => s + a.amount, 0);
  const TOTAL_IN  = 4500.00;
  const REMAINING = ACCOUNTS.filter(a => a.month >= 4).reduce((s, a) => s + a.amount, 0);

  // Today
  const TODAY = new Date(2026, 4, 18); // May 18 2026

  function fmt(n) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function daysFromToday(d) {
    return Math.round((d - TODAY) / 86400000);
  }
  function dueDateOf(a) {
    return new Date(a.year, a.month, a.dueDay);
  }
  function dueLabel(a) {
    const d = dueDateOf(a);
    const dd = daysFromToday(d);
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const base = `${a.dueDay} ${months[a.month]} ${a.year}`;
    if (dd < 0) return `${base} · há ${-dd}d`;
    if (dd === 0) return `${base} · hoje`;
    return `${base} · em ${dd}d`;
  }
  function catColor(catId) {
    const c = CATEGORIES.find(x => x.id === catId);
    return c ? `oklch(0.74 0.10 ${c.hue})` : 'var(--ink-mute)';
  }
  function catTint(catId) {
    const c = CATEGORIES.find(x => x.id === catId);
    return c ? `oklch(0.30 0.05 ${c.hue})` : 'var(--surface-2)';
  }

  // Expenses-by-category breakdown
  const breakdown = {};
  for (const a of ACCOUNTS) {
    const k = a.cats[0];
    breakdown[k] = (breakdown[k] || 0) + a.amount;
  }
  const BREAKDOWN = Object.entries(breakdown)
    .map(([id, value]) => ({ id, name: (CATEGORIES.find(c => c.id === id) || {}).name, value, pct: value / TOTAL_OUT * 100 }))
    .sort((a, b) => b.value - a.value);

  // 12-month history (Jan→Dez 2026). Despesas + receitas.
  const MONTHS_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const HISTORY = [
    { in: 4500, out: 3210 },
    { in: 4500, out: 4180 },
    { in: 4500, out: 3890 },
    { in: 4500, out: 4520 },
    { in: 4500, out: 6810.25 }, // current
    { in: 4500, out: 2492 }, // projected
    { in: 4500, out: 3300 },
    { in: 4500, out: 3550 },
    { in: 4500, out: 3210 },
    { in: 4500, out: 3120 },
    { in: 4500, out: 3450 },
    { in: 4500, out: 4900 },
  ];
  const CURRENT_MONTH_IDX = 4; // May

  // Saldo do ciclo: last 6 month-end balances (cumulative drift)
  const RECENT_BALANCE = [-220, -480, -300, -150, -994.25];

  // Estatísticas KPIs
  const TOTAL_EM_DIVIDAS = HISTORY.reduce((s, m) => s + m.out, 0);
  const TOTAL_PAGO = HISTORY.slice(0, CURRENT_MONTH_IDX).reduce((s, m) => s + m.out, 0);
  const FIXOS_MENSAIS = ACCOUNTS.filter(a => a.cats.includes('fixo')).reduce((s, a) => s + a.amount, 0);
  const FIXOS_COUNT = ACCOUNTS.filter(a => a.cats.includes('fixo')).length;

  // Vencimentos por dia (May)
  const DUE_BY_DAY = {};
  for (const a of ACCOUNTS) if (a.month === 4) DUE_BY_DAY[a.dueDay] = (DUE_BY_DAY[a.dueDay] || 0) + 1;

  // Metas
  const METAS = [
    { id: 1, name: 'Viagem pro Chile',   tipo: 'Poupança',  current: 1850,  target: 5000, hue: 290, prazo: 'Out 2026' },
    { id: 2, name: 'Reserva emergência', tipo: 'Poupança',  current: 8200,  target: 15000, hue: 145, prazo: 'Dez 2026' },
    { id: 3, name: 'MacBook novo',       tipo: 'Compra',    current: 3400,  target: 12000, hue: 220, prazo: 'Mar 2027' },
    { id: 4, name: 'Quitar Picpay',      tipo: 'Quitação',  current: 4400,  target: 5500,  hue: 25,  prazo: 'Set 2026' },
  ];

  return {
    CATEGORIES, ACCOUNTS, BREAKDOWN,
    TOTAL_OUT, TOTAL_IN, REMAINING,
    TODAY, fmt, dueLabel, daysFromToday, dueDateOf,
    catColor, catTint,
    HISTORY, MONTHS_LABEL, CURRENT_MONTH_IDX, RECENT_BALANCE,
    TOTAL_EM_DIVIDAS, TOTAL_PAGO, FIXOS_MENSAIS, FIXOS_COUNT,
    DUE_BY_DAY, METAS,
  };
})();
