/**
 * Tool registry the LLM can call. Read tools execute immediately and
 * return JSON-serializable summaries. Write tools require user
 * confirmation in the chat UI — `safety: 'confirm'` signals that.
 *
 * Each tool's `parameters` schema is in the JSONSchema-ish shape Ollama
 * forwards to models that support tool calling (llama3.2, qwen2.5,
 * mistral, etc.).
 */

import type {
  Debt,
  Entity,
  FinanceAction,
  FinanceState,
  Goal,
  Income,
  Installment,
} from '@/lib/types';
import {
  getNextUnpaidInstallment,
  isRecurringActiveForMonth,
} from '@/lib/services/installment';
import { getBillsDueSoon } from '@/lib/services/notifications';
import type { OllamaTool } from '@/lib/services/ollama';

type ToolSafety = 'auto' | 'confirm';

interface ToolCtx {
  state: FinanceState;
  dispatch: React.Dispatch<FinanceAction>;
}

export interface ToolDefinition<TArgs = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  parameters: OllamaTool['function']['parameters'];
  safety: ToolSafety;
  /** Returns the user-facing label for the confirmation card (write tools
   * only). Read tools may return null. */
  describeCall(args: TArgs, state: FinanceState): string | null;
  execute(args: TArgs, ctx: ToolCtx): TResult;
}

// We store them as a uniform `unknown` shape because the args/result
// vary per tool and the registry/executor is dispatched by name.
type AnyTool = ToolDefinition<Record<string, unknown>, unknown>;

const TOOLS: AnyTool[] = [];

function register<TArgs extends Record<string, unknown>, TResult>(
  tool: ToolDefinition<TArgs, TResult>
): void {
  TOOLS.push(tool as unknown as AnyTool);
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────
// READ TOOLS
// ─────────────────────────────────────────────────────────────────────

register<Record<string, never>, unknown>({
  name: 'get_accounts',
  description: 'Lista todas as contas/carteiras do usuário com saldos atuais.',
  parameters: { type: 'object', properties: {} },
  safety: 'auto',
  describeCall: () => null,
  execute: (_args, { state }) => ({
    accounts: state.accounts
      .filter((a) => !a.archived)
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.currentBalance,
        is_primary: !!a.isPrimary,
      })),
    total_balance: state.accounts
      .filter((a) => !a.archived)
      .reduce(
        (s, a) =>
          s + (a.type === 'credit_card' ? -(a.currentBalance || 0) : a.currentBalance || 0),
        0
      ),
  }),
});

register<{ days_ahead?: number }, unknown>({
  name: 'get_upcoming_bills',
  description:
    'Lista as contas/dívidas que vencem dentro dos próximos N dias, incluindo as atrasadas. Use quando o usuário perguntar "o que vence", "contas a pagar" ou "atrasadas".',
  parameters: {
    type: 'object',
    properties: {
      days_ahead: {
        type: 'number',
        description: 'Quantos dias à frente olhar (default 7, máx 60)',
      },
    },
  },
  safety: 'auto',
  describeCall: () => null,
  execute: (args, { state }) => {
    const daysAhead = clampInt(args.days_ahead ?? 7, 1, 60);
    const bills = getBillsDueSoon(
      { debts: state.debts, installments: state.installments, snoozes: state.snoozes },
      daysAhead
    );
    return {
      bills: bills.map((b) => ({
        key: b.key,
        debt_id: b.debt.id,
        account_name: b.debt.accountName,
        amount: b.debt.installmentValue,
        due_date: b.dueDate,
        days_away: b.daysAway,
        status:
          b.daysAway < 0 ? 'overdue' : b.daysAway === 0 ? 'today' : b.daysAway <= 7 ? 'soon' : 'ok',
        entities: b.debt.entityNames,
      })),
      total: bills.reduce((s, b) => s + b.debt.installmentValue, 0),
    };
  },
});

register<{ month?: number; year?: number }, unknown>({
  name: 'get_month_summary',
  description:
    'Resumo financeiro de um mês: receita total, despesas previstas, despesas pagas, saldo projetado e uso do orçamento.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'number', description: '1-12 (default mês atual)' },
      year: { type: 'number', description: '4 dígitos (default ano atual)' },
    },
  },
  safety: 'auto',
  describeCall: () => null,
  execute: (args, { state }) => {
    const now = new Date();
    const month = clampInt(args.month ?? now.getMonth() + 1, 1, 12);
    const year = clampInt(args.year ?? now.getFullYear(), 2000, 2200);
    let expenses = 0;
    let paid = 0;
    for (const debt of state.debts as Debt[]) {
      if (debt.isRecurring) {
        if (isRecurringActiveForMonth(debt, month, year)) {
          expenses += debt.installmentValue;
        }
      } else {
        const monthInsts = state.installments.filter((i: Installment) => {
          if (i.debtId !== debt.id) return false;
          const [iy, im] = i.dueDate.split('-').map(Number);
          return iy === year && im === month;
        });
        expenses += monthInsts.length * debt.installmentValue;
        paid += monthInsts.filter((i) => i.isPaid).length * debt.installmentValue;
      }
    }
    let income = state.user.salary;
    let pixOut = 0;
    for (const inc of state.incomes as Income[]) {
      const [iy, im] = inc.date.split('-').map(Number);
      if (iy !== year || im !== month) continue;
      if (inc.direction === 'entrada') income += inc.amount;
      else pixOut += inc.amount;
    }
    const totalExpenses = expenses + pixOut;
    const budget = state.user.monthlyBudget;
    return {
      month,
      year,
      income,
      expenses_committed: totalExpenses,
      expenses_paid: paid + pixOut,
      remaining_to_pay: Math.max(0, expenses - paid),
      projected_balance: income - totalExpenses,
      monthly_budget: budget,
      budget_used_pct: budget > 0 ? Math.round((totalExpenses / budget) * 1000) / 10 : null,
    };
  },
});

register<{ month?: number; year?: number }, unknown>({
  name: 'get_category_breakdown',
  description:
    'Quanto cada categoria/entidade representa nas despesas de um mês. Use quando o usuário quiser saber "onde está gastando mais".',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'number', description: '1-12 (default mês atual)' },
      year: { type: 'number', description: '4 dígitos (default ano atual)' },
    },
  },
  safety: 'auto',
  describeCall: () => null,
  execute: (args, { state }) => {
    const now = new Date();
    const month = clampInt(args.month ?? now.getMonth() + 1, 1, 12);
    const year = clampInt(args.year ?? now.getFullYear(), 2000, 2200);
    const totals = new Map<string, number>();
    for (const debt of state.debts as Debt[]) {
      const monthly = debt.isRecurring
        ? isRecurringActiveForMonth(debt, month, year)
          ? debt.installmentValue
          : 0
        : (state.installments as Installment[]).filter((i) => {
            if (i.debtId !== debt.id) return false;
            const [iy, im] = i.dueDate.split('-').map(Number);
            return iy === year && im === month;
          }).length * debt.installmentValue;
      if (monthly <= 0 || debt.entityIds.length === 0) continue;
      const share = monthly / debt.entityIds.length;
      for (const eid of debt.entityIds) {
        totals.set(eid, (totals.get(eid) ?? 0) + share);
      }
    }
    const grand = Array.from(totals.values()).reduce((s, v) => s + v, 0) || 1;
    const rows = Array.from(totals.entries())
      .map(([id, value]) => {
        const ent = (state.entities as Entity[]).find((e) => e.id === id);
        return {
          entity_id: id,
          name: ent?.name ?? 'Sem categoria',
          value,
          pct: Math.round((value / grand) * 1000) / 10,
        };
      })
      .sort((a, b) => b.value - a.value);
    return { month, year, total: grand, categories: rows };
  },
});

register<{ query?: string }, unknown>({
  name: 'search_debts',
  description:
    'Busca dívidas/contas por nome (substring case-insensitive). Use pra encontrar o id certo antes de marcar paga.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Trecho do nome (ex: "internet", "youtube")' },
    },
    required: ['query'],
  },
  safety: 'auto',
  describeCall: () => null,
  execute: (args, { state }) => {
    const q = (args.query ?? '').toLowerCase().trim();
    if (!q) return { matches: [] };
    const matches = (state.debts as Debt[])
      .filter((d) => d.accountName.toLowerCase().includes(q))
      .map((d) => {
        const next = d.isRecurring
          ? null
          : getNextUnpaidInstallment(state.installments as Installment[], d.id);
        return {
          id: d.id,
          name: d.accountName,
          amount: d.installmentValue,
          is_recurring: d.isRecurring,
          next_due: next?.dueDate ?? null,
          next_installment_id: next?.id ?? null,
        };
      });
    return { matches };
  },
});

register<Record<string, never>, unknown>({
  name: 'get_goals',
  description: 'Lista metas/objetivos do usuário com progresso atual.',
  parameters: { type: 'object', properties: {} },
  safety: 'auto',
  describeCall: () => null,
  execute: (_args, { state }) => ({
    goals: (state.goals as Goal[]).map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      target: g.targetValue,
      current: g.currentValue,
      pct: g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 1000) / 10 : 0,
      deadline: g.deadline,
    })),
  }),
});

register<Record<string, never>, unknown>({
  name: 'get_recurring_incomes',
  description: 'Lista receitas fixas (salário, freela recorrente, etc).',
  parameters: { type: 'object', properties: {} },
  safety: 'auto',
  describeCall: () => null,
  execute: (_args, { state }) => ({
    incomes: state.recurringIncomes.map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      due_day: r.dueDay,
      active: r.isActive,
    })),
  }),
});

// ─────────────────────────────────────────────────────────────────────
// WRITE TOOLS — require user confirmation
// ─────────────────────────────────────────────────────────────────────

register<{ debt_id: string; installment_id?: string; due_date?: string }, unknown>({
  name: 'mark_bill_paid',
  description:
    'Marca uma parcela ou conta recorrente como paga. SEMPRE chame search_debts antes pra obter o debt_id correto. Para recorrentes, passe due_date no formato YYYY-MM-DD.',
  parameters: {
    type: 'object',
    properties: {
      debt_id: { type: 'string' },
      installment_id: {
        type: 'string',
        description:
          'Para dívidas parceladas — id retornado por search_debts.next_installment_id',
      },
      due_date: { type: 'string', description: 'YYYY-MM-DD para contas recorrentes' },
    },
    required: ['debt_id'],
  },
  safety: 'confirm',
  describeCall: (args, state) => {
    const debt = state.debts.find((d) => d.id === args.debt_id);
    if (!debt) return `Marcar ${args.debt_id} como pago`;
    return `Marcar "${debt.accountName}" (R$ ${debt.installmentValue.toFixed(2)}) como pago`;
  },
  execute: (args, { dispatch }) => {
    dispatch({
      type: 'MARK_PAID',
      payload: {
        debtId: args.debt_id,
        installmentId: args.installment_id,
        dueDate: args.due_date,
      },
    });
    return { ok: true };
  },
});

register<{ description: string; amount: number; date?: string }, unknown>({
  name: 'add_income',
  description: 'Lança uma receita (entrada de dinheiro) avulsa em uma data.',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      amount: { type: 'number' },
      date: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['description', 'amount'],
  },
  safety: 'confirm',
  describeCall: (args) =>
    `Lançar entrada: ${args.description} — R$ ${Number(args.amount).toFixed(2)}${args.date ? ` em ${args.date}` : ''}`,
  execute: (args, { dispatch }) => {
    dispatch({
      type: 'ADD_INCOME',
      payload: {
        description: args.description,
        amount: Number(args.amount),
        date: args.date ?? todayISO(),
        direction: 'entrada',
      },
    });
    return { ok: true };
  },
});

register<{ description: string; amount: number; date?: string }, unknown>({
  name: 'add_expense',
  description: 'Lança uma despesa avulsa (PIX, dinheiro vivo, etc) em uma data.',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      amount: { type: 'number' },
      date: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['description', 'amount'],
  },
  safety: 'confirm',
  describeCall: (args) =>
    `Lançar despesa: ${args.description} — R$ ${Number(args.amount).toFixed(2)}${args.date ? ` em ${args.date}` : ''}`,
  execute: (args, { dispatch }) => {
    dispatch({
      type: 'ADD_INCOME',
      payload: {
        description: args.description,
        amount: Number(args.amount),
        date: args.date ?? todayISO(),
        direction: 'saida',
      },
    });
    return { ok: true };
  },
});

register<{ bill_key: string; days: number }, unknown>({
  name: 'snooze_bill',
  description: 'Adia notificações de uma conta por N dias (1, 3 ou 7 são valores comuns).',
  parameters: {
    type: 'object',
    properties: {
      bill_key: {
        type: 'string',
        description: 'Formato `${debtId}@${dueDate}` — pegue de get_upcoming_bills.',
      },
      days: { type: 'number' },
    },
    required: ['bill_key', 'days'],
  },
  safety: 'confirm',
  describeCall: (args) =>
    `Adiar notificação por ${args.days} dia${args.days === 1 ? '' : 's'}`,
  execute: (args, { dispatch }) => {
    const until = new Date();
    until.setDate(until.getDate() + clampInt(args.days, 1, 60));
    until.setHours(23, 59, 59, 0);
    dispatch({
      type: 'SNOOZE_BILL',
      payload: { billKey: args.bill_key, until: until.toISOString() },
    });
    return { ok: true };
  },
});

register<
  {
    name: string;
    installment_value: number;
    number_of_installments: number;
    due_day: number;
    start_month?: number;
    start_year?: number;
    // Some models return this as a comma-joined string, others as an
    // array — accept both shapes and normalize at runtime.
    entity_names?: string[] | string;
  },
  unknown
>({
  name: 'add_debt',
  description:
    'Cria uma nova dívida ou conta recorrente. Passe number_of_installments=0 para contas recorrentes (luz, aluguel). Para parcelados, use o total de parcelas (ex: 12 para 12x). entity_names liga categorias existentes pelo nome (case-insensitive).',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Nome da conta/dívida' },
      installment_value: { type: 'number', description: 'Valor de cada parcela (R$)' },
      number_of_installments: {
        type: 'number',
        description: '0 = recorrente/fixa; >0 = total de parcelas',
      },
      due_day: { type: 'number', description: 'Dia do mês de vencimento (1-31)' },
      start_month: { type: 'number', description: '1-12 (default mês atual)' },
      start_year: { type: 'number', description: '4 dígitos (default ano atual)' },
      entity_names: {
        type: 'string',
        description: 'Lista de nomes de categorias separados por vírgula (opcional)',
      },
    },
    required: ['name', 'installment_value', 'number_of_installments', 'due_day'],
  },
  safety: 'confirm',
  describeCall: (args) =>
    `Criar ${args.number_of_installments === 0 ? 'conta recorrente' : `dívida em ${args.number_of_installments}x`}: ${args.name} — R$ ${Number(args.installment_value).toFixed(2)} dia ${args.due_day}`,
  execute: (args, { state, dispatch }) => {
    const now = new Date();
    // Resolve entity names → ids (case-insensitive substring match).
    const wantedNames = Array.isArray(args.entity_names)
      ? args.entity_names
      : typeof args.entity_names === 'string'
        ? args.entity_names.split(',').map((s) => s.trim())
        : [];
    const matched = wantedNames
      .map((n: string) => {
        const lower = n.toLowerCase();
        return (state.entities as Entity[]).find((e) => e.name.toLowerCase() === lower) ??
          (state.entities as Entity[]).find((e) => e.name.toLowerCase().includes(lower));
      })
      .filter((e): e is Entity => !!e);
    dispatch({
      type: 'ADD_DEBT',
      payload: {
        accountName: args.name,
        installmentValue: Number(args.installment_value),
        numberOfInstallments: clampInt(args.number_of_installments, 0, 360),
        dueDay: clampInt(args.due_day, 1, 31),
        startMonth: clampInt(args.start_month ?? now.getMonth() + 1, 1, 12),
        startYear: clampInt(args.start_year ?? now.getFullYear(), 2000, 2200),
        entityIds: matched.map((e) => e.id),
        entityNames: matched.map((e) => e.name),
      },
    });
    return { ok: true };
  },
});

register<{ installment_id: string }, unknown>({
  name: 'mark_unpaid',
  description:
    'Desmarca uma parcela como paga (desfaz um mark_bill_paid). Use o installment_id retornado por search_debts.',
  parameters: {
    type: 'object',
    properties: {
      installment_id: { type: 'string' },
    },
    required: ['installment_id'],
  },
  safety: 'confirm',
  describeCall: (args, state) => {
    const inst = state.installments.find((i) => i.id === args.installment_id);
    if (!inst) return `Desmarcar pagamento ${args.installment_id}`;
    const debt = state.debts.find((d) => d.id === inst.debtId);
    return `Desmarcar pagamento: ${debt?.accountName ?? inst.debtId} parcela ${inst.installmentNumber}/${debt?.numberOfInstallments ?? '?'}`;
  },
  execute: (args, { dispatch }) => {
    dispatch({ type: 'UNMARK_PAID', payload: { installmentId: args.installment_id } });
    return { ok: true };
  },
});

register<
  {
    name: string;
    type?: 'checking' | 'savings' | 'cash' | 'credit_card';
    current_balance?: number;
  },
  unknown
>({
  name: 'add_account',
  description:
    'Cria uma nova conta/carteira (banco, poupança, dinheiro físico ou cartão de crédito). Para credit_card, o currentBalance representa a fatura aberta.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      type: {
        type: 'string',
        enum: ['checking', 'savings', 'cash', 'credit_card'],
        description: 'default: checking',
      },
      current_balance: { type: 'number', description: 'Saldo inicial (default 0)' },
    },
    required: ['name'],
  },
  safety: 'confirm',
  describeCall: (args) =>
    `Criar carteira "${args.name}" (${args.type ?? 'checking'})${
      args.current_balance ? ` com R$ ${Number(args.current_balance).toFixed(2)}` : ''
    }`,
  execute: (args, { dispatch }) => {
    dispatch({
      type: 'ADD_ACCOUNT',
      payload: {
        name: args.name,
        type: args.type ?? 'checking',
        currentBalance: Number(args.current_balance ?? 0),
      },
    });
    return { ok: true };
  },
});

register<
  { from_account_id: string; to_account_id: string; amount: number; note?: string },
  unknown
>({
  name: 'transfer_between_accounts',
  description:
    'Move dinheiro entre duas contas/carteiras do usuário. Use get_accounts antes pra confirmar os ids.',
  parameters: {
    type: 'object',
    properties: {
      from_account_id: { type: 'string' },
      to_account_id: { type: 'string' },
      amount: { type: 'number' },
      note: { type: 'string' },
    },
    required: ['from_account_id', 'to_account_id', 'amount'],
  },
  safety: 'confirm',
  describeCall: (args, state) => {
    const from = state.accounts.find((a) => a.id === args.from_account_id);
    const to = state.accounts.find((a) => a.id === args.to_account_id);
    return `Transferir R$ ${Number(args.amount).toFixed(2)} de ${from?.name ?? args.from_account_id} → ${to?.name ?? args.to_account_id}`;
  },
  execute: (args, { dispatch }) => {
    dispatch({
      type: 'ADD_TRANSFER',
      payload: {
        fromAccountId: args.from_account_id,
        toAccountId: args.to_account_id,
        amount: Number(args.amount),
        date: todayISO(),
        note: args.note,
      },
    });
    return { ok: true };
  },
});

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export function getTools(): AnyTool[] {
  return TOOLS;
}

export function toolsToOllamaSchema(): OllamaTool[] {
  return TOOLS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function findTool(name: string): AnyTool | undefined {
  return TOOLS.find((t) => t.name === name);
}

export interface ToolExecutionResult {
  output: string;
  ok: boolean;
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCtx
): ToolExecutionResult {
  const tool = findTool(name);
  if (!tool) {
    return { ok: false, output: JSON.stringify({ error: `Tool desconhecida: ${name}` }) };
  }
  try {
    const result = tool.execute(args, ctx);
    return { ok: true, output: JSON.stringify(result) };
  } catch (err) {
    return {
      ok: false,
      output: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
}
