// Pure functions — no DB access — so they can be unit tested directly.
// Ported 1:1 from the budget burn-down rules in Midas.dc.html.

export const RAISE_INCREMENT = 250000;

export function computeSpent(baseSpent: number, matchingExpenseSum: number): number {
  return baseSpent + matchingExpenseSum;
}

export function computeRemain(limitAmount: number, raiseAmount: number, spent: number): number {
  return limitAmount + raiseAmount - spent;
}

export function isLocked(remain: number): boolean {
  return remain <= 0;
}

export function isTight(remain: number, limitAmount: number): boolean {
  return !isLocked(remain) && remain / limitAmount < 0.15;
}

export function percentSpent(spent: number, limitAmount: number): number {
  return Math.min(100, Math.round((spent / limitAmount) * 100));
}

export interface BudgetLike {
  categoryId: string;
  subcategoryId: string | null;
}

export function findBudgetFor<T extends BudgetLike>(
  budgetsList: readonly T[],
  categoryId: string,
  subcategoryId: string | null
): T | null {
  const exact = budgetsList.find((b) => b.categoryId === categoryId && b.subcategoryId === subcategoryId);
  if (exact) return exact;
  return budgetsList.find((b) => b.categoryId === categoryId && b.subcategoryId === null) ?? null;
}
