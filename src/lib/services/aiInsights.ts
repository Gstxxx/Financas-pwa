/**
 * One-shot LLM call that generates 1–2 short insights about the current
 * month's finances. Independent of the conversation loop in ChatContext —
 * we don't want each /home navigation to mutate the chat history.
 *
 * Results are cached per session keyed by a content hash of the input
 * summary so flipping between pages doesn't keep hitting the model.
 */

import type { FinanceState } from '@/lib/types';
import { isRecurringActiveForMonth } from '@/lib/services/installment';
import { streamChat, type OllamaSettings } from '@/lib/services/ollama';

const CACHE_KEY_PREFIX = 'finance_ai_insight_v1:';

export interface AiInsight {
  title: string;
  body: string;
}

/** Builds a compact text snapshot the model can chew on without bloating
 * the prompt. ~250 tokens worst case. */
function buildSummary(state: FinanceState): { text: string; signature: string } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Sum month expenses (debts + recurring + manual saidas)
  let totalExpenses = 0;
  let paidExpenses = 0;
  const categoryTotals = new Map<string, number>();
  for (const debt of state.debts) {
    const monthly = debt.isRecurring
      ? isRecurringActiveForMonth(debt, month, year)
        ? debt.installmentValue
        : 0
      : state.installments.filter((i) => {
          if (i.debtId !== debt.id) return false;
          const [iy, im] = i.dueDate.split('-').map(Number);
          return iy === year && im === month;
        }).length * debt.installmentValue;
    if (monthly <= 0) continue;
    totalExpenses += monthly;
    if (!debt.isRecurring) {
      const paid = state.installments.filter((i) => {
        if (i.debtId !== debt.id || !i.isPaid) return false;
        const [iy, im] = i.dueDate.split('-').map(Number);
        return iy === year && im === month;
      }).length * debt.installmentValue;
      paidExpenses += paid;
    }
    if (debt.entityIds.length > 0) {
      const share = monthly / debt.entityIds.length;
      for (const eid of debt.entityIds) {
        const ent = state.entities.find((e) => e.id === eid);
        const key = ent?.name ?? 'Outros';
        categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + share);
      }
    }
  }

  let extraIncome = 0;
  let pixOut = 0;
  for (const inc of state.incomes) {
    const [iy, im] = inc.date.split('-').map(Number);
    if (iy !== year || im !== month) continue;
    if (inc.direction === 'entrada') extraIncome += inc.amount;
    else pixOut += inc.amount;
  }
  const totalIncome = state.user.salary + extraIncome;
  const totalOut = totalExpenses + pixOut;
  const budget = state.user.monthlyBudget;
  const balance = state.accounts
    .filter((a) => !a.archived)
    .reduce(
      (s, a) => s + (a.type === 'credit_card' ? -(a.currentBalance || 0) : a.currentBalance || 0),
      0
    );

  const topCategories = Array.from(categoryTotals.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const lines: string[] = [
    `Mês: ${month}/${year}`,
    `Receita total: R$ ${totalIncome.toFixed(2)} (salário ${state.user.salary.toFixed(2)} + extras ${extraIncome.toFixed(2)})`,
    `Despesas comprometidas: R$ ${totalOut.toFixed(2)} (pagas ${(paidExpenses + pixOut).toFixed(2)})`,
    `Orçamento mensal: R$ ${budget.toFixed(2)} (uso ${budget > 0 ? ((totalOut / budget) * 100).toFixed(1) : 0}%)`,
    `Saldo total das carteiras: R$ ${balance.toFixed(2)}`,
    `Top categorias do mês: ${topCategories.map(([n, v]) => `${n} R$ ${v.toFixed(0)}`).join(', ') || 'nenhuma'}`,
  ];
  const text = lines.join('\n');
  // Stable signature for cache key: ignore granular cents to avoid
  // re-fetching when the user makes a R$0.50 lançamento.
  const signature = `${month}-${year}-${Math.floor(totalOut / 10)}-${Math.floor(balance / 10)}-${topCategories.map(([n]) => n).join(',')}`;
  return { text, signature };
}

function parseInsights(raw: string): AiInsight[] {
  const out: AiInsight[] = [];
  // Try JSON array first.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed.slice(0, 2)) {
        if (item && typeof item === 'object' && item.title && item.body) {
          out.push({ title: String(item.title), body: String(item.body) });
        }
      }
      if (out.length > 0) return out;
    }
  } catch {
    // Fall back to heuristic parsing below.
  }

  // Heuristic: lines starting with "- TITLE: body" or "1. TITLE: body"
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•]?\s*\d*\.?\s*/, '').trim())
    .filter((l) => l.length > 0);
  for (const line of lines.slice(0, 2)) {
    const colon = line.indexOf(':');
    if (colon > 3 && colon < 60) {
      out.push({
        title: line.slice(0, colon).trim().replace(/[*_]/g, ''),
        body: line.slice(colon + 1).trim(),
      });
    } else {
      // Single sentence becomes its own card.
      out.push({ title: 'Observação', body: line });
    }
  }
  return out.slice(0, 2);
}

export interface FetchAiInsightsResult {
  insights: AiInsight[];
  cached: boolean;
}

export async function fetchAiInsights(
  state: FinanceState,
  settings: OllamaSettings,
  signal?: AbortSignal
): Promise<FetchAiInsightsResult> {
  if (!settings.baseUrl || !settings.model) {
    return { insights: [], cached: false };
  }
  const { text: summary, signature } = buildSummary(state);
  const cacheKey = CACHE_KEY_PREFIX + signature;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return { insights: JSON.parse(cached) as AiInsight[], cached: true };
    }
  } catch {
    /* ignore */
  }

  // Prompt designed for a single one-shot call (no tools). Asks for JSON
  // so parsing is deterministic; falls back to heuristic if the model
  // ignores the format request.
  const prompt = `Você é um analista financeiro. Receba o resumo abaixo e devolva entre 1 e 2 observações breves, acionáveis, em português brasileiro. Foque em padrões ou alertas — nada genérico tipo "controle seus gastos".

RESUMO:
${summary}

Responda APENAS com um array JSON no formato:
[{"title":"Título curto","body":"Frase única explicando, máximo 140 caracteres."}]

Sem texto adicional. Sem markdown.`;

  let fullText = '';
  try {
    await streamChat({
      baseUrl: settings.baseUrl,
      model: settings.model,
      messages: [{ role: 'user', content: prompt }],
      signal,
      onChunk: (c) => {
        fullText += c.contentDelta;
      },
    });
  } catch {
    return { insights: [], cached: false };
  }

  const insights = parseInsights(fullText.trim());
  if (insights.length > 0) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(insights));
    } catch {
      /* ignore quota */
    }
  }
  return { insights, cached: false };
}
