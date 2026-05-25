import { FinanceState } from '@/lib/types';

export function exportToJSON(state: Omit<FinanceState, 'isHydrated'>): string {
  return JSON.stringify(state, null, 2);
}

export function downloadJSON(state: Omit<FinanceState, 'isHydrated'>, filename?: string) {
  const json = exportToJSON(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `financas-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromJSON(jsonString: string): Omit<FinanceState, 'isHydrated'> | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.user || !Array.isArray(data.entities) || !Array.isArray(data.debts)) {
      return null;
    }
    return {
      user: data.user,
      entities: data.entities || [],
      debts: data.debts || [],
      installments: data.installments || [],
      budgets: data.budgets || [],
      goals: data.goals || [],
      incomes: data.incomes || [],
      snoozes: data.snoozes || {},
    };
  } catch {
    return null;
  }
}

export async function exportToDiscord(
  webhookUrl: string,
  state: Omit<FinanceState, 'isHydrated'>
): Promise<boolean> {
  try {
    const totalDebts = state.debts.length;
    const totalEntities = state.entities.length;
    const totalGoals = state.goals.length;
    const paidInstallments = state.installments.filter((i) => i.isPaid).length;
    const totalInstallments = state.installments.length;

    const embed = {
      title: 'Dashboard Financeiro - Backup',
      color: 0xa78bfa,
      fields: [
        { name: 'Salario', value: `R$ ${state.user.salary.toFixed(2)}`, inline: true },
        { name: 'Saldo', value: `R$ ${state.user.currentBalance.toFixed(2)}`, inline: true },
        { name: 'Contas', value: `${totalDebts}`, inline: true },
        { name: 'Categorias', value: `${totalEntities}`, inline: true },
        { name: 'Parcelas', value: `${paidInstallments}/${totalInstallments} pagas`, inline: true },
        { name: 'Metas', value: `${totalGoals}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    const json = exportToJSON(state);
    const blob = new Blob([json], { type: 'application/json' });

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({ embeds: [embed] }));
    formData.append('files[0]', blob, `financas-${new Date().toISOString().split('T')[0]}.json`);

    const response = await fetch(webhookUrl, { method: 'POST', body: formData });
    return response.ok;
  } catch {
    return false;
  }
}
