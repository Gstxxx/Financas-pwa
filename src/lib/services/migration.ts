import { LegacyTransaction, Entity, Debt, Installment, User } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { Storage, STORAGE_KEYS } from '@/lib/storage';

export function migrateLegacyData(): {
  user: User;
  entities: Entity[];
  debts: Debt[];
  installments: Installment[];
} | null {
  const legacy = Storage.get<LegacyTransaction[]>(STORAGE_KEYS.LEGACY_CONTAS);
  if (!legacy || !Array.isArray(legacy) || legacy.length === 0) return null;

  // Already migrated?
  if (Storage.get(STORAGE_KEYS.DEBTS)) return null;

  // Extract unique tags as entities
  const tagSet = new Set<string>();
  legacy.forEach((t) => (t.tags || []).forEach((tag) => tagSet.add(tag)));

  const entities: Entity[] = Array.from(tagSet).map((tag) => ({
    id: generateId(),
    name: tag.charAt(0).toUpperCase() + tag.slice(1),
    createdAt: new Date().toISOString(),
  }));

  const entityMap = new Map<string, Entity>();
  entities.forEach((e) => entityMap.set(e.name.toLowerCase(), e));

  // Calculate totals for user
  const totalIn = legacy
    .filter((t) => t.direction === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const user: User = {
    salary: totalIn || 4500,
    currentBalance: 0,
    monthlyBudget: totalIn || 4500,
  };

  const debts: Debt[] = [];
  const installments: Installment[] = [];

  legacy.forEach((t) => {
    if (t.direction === 'entrada') return; // Skip income entries

    const tag = (t.tags || [])[0] || 'outros';
    const entity = entityMap.get(tag) || entityMap.get('outros');

    const isParcelado = (t.tags || []).includes('parcelado');
    const hasEndDate = !!t.endDate;

    let numberOfInstallments = 0;
    if (isParcelado && hasEndDate && t.startDate) {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate!);
      numberOfInstallments = Math.max(
        1,
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
      );
    }

    const dueDate = t.dueDate ? new Date(t.dueDate) : new Date();
    const startDate = t.startDate ? new Date(t.startDate) : dueDate;

    const debt: Debt = {
      id: generateId(),
      accountName: t.name,
      installmentValue: t.amount,
      numberOfInstallments,
      dueDay: dueDate.getDate(),
      startMonth: startDate.getMonth() + 1,
      startYear: startDate.getFullYear(),
      entityId: entity?.id || '',
      entityName: entity?.name || tag,
      isRecurring: numberOfInstallments === 0,
      createdAt: new Date().toISOString(),
    };

    debts.push(debt);

    // Generate installments for parcelado
    if (numberOfInstallments > 0) {
      let month = debt.startMonth;
      let year = debt.startYear;
      const paidCount = t.progress ? Math.round((t.progress / 100) * numberOfInstallments) : 0;

      for (let i = 1; i <= numberOfInstallments; i++) {
        const dueDateStr = `${year}-${String(month).padStart(2, '0')}-${String(debt.dueDay).padStart(2, '0')}`;
        installments.push({
          id: generateId() + `-${i}`,
          debtId: debt.id,
          installmentNumber: i,
          dueDate: dueDateStr,
          isPaid: i <= paidCount,
          paidAt: i <= paidCount ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        });
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    }
  });

  return { user, entities, debts, installments };
}
