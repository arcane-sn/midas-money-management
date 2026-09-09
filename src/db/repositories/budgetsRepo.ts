import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { budgets, transactions, categories, subcategories } from '../schema';
import { computeSpent, computeRemain, isLocked, isTight, percentSpent, findBudgetFor, RAISE_INCREMENT } from './budgetLogic';
import { generateId } from '../../utils/id';

export type Budget = typeof budgets.$inferSelect;

export interface BudgetView {
  id: string;
  name: string;
  categoryName: string;
  isSubBudget: boolean;
  limitAmount: number;
  spent: number;
  remain: number;
  percent: number;
  locked: boolean;
  tight: boolean;
}

async function toView(db: Database, budget: Budget): Promise<BudgetView> {
  const category = (await db.select().from(categories).where(eq(categories.id, budget.categoryId)).limit(1))[0];
  const sub = budget.subcategoryId
    ? (await db.select().from(subcategories).where(eq(subcategories.id, budget.subcategoryId)).limit(1))[0]
    : null;
  const allTx = await db.select().from(transactions);
  const matching = allTx.filter(
    (t) =>
      t.type === 'expense' &&
      t.categoryId === budget.categoryId &&
      (budget.subcategoryId === null || t.subcategoryId === budget.subcategoryId)
  );
  const matchingSum = matching.reduce((sum, t) => sum + t.amount, 0);
  const spent = computeSpent(budget.baseSpent, matchingSum);
  const remain = computeRemain(budget.limitAmount, budget.raiseAmount, spent);
  return {
    id: budget.id,
    name: sub?.name ?? category?.name ?? budget.categoryId,
    categoryName: category?.name ?? budget.categoryId,
    isSubBudget: budget.subcategoryId !== null,
    limitAmount: budget.limitAmount + budget.raiseAmount,
    spent,
    remain,
    percent: percentSpent(spent, budget.limitAmount + budget.raiseAmount),
    locked: isLocked(remain),
    tight: isTight(remain, budget.limitAmount + budget.raiseAmount),
  };
}

export async function listBudgetViews(db: Database): Promise<BudgetView[]> {
  const all = await db.select().from(budgets);
  return Promise.all(all.map((b) => toView(db, b)));
}

export async function getBudgetView(db: Database, id: string): Promise<BudgetView | null> {
  const rows = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  if (!rows[0]) return null;
  return toView(db, rows[0]);
}

export async function getBudgetTransactions(db: Database, id: string) {
  const rows = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  const budget = rows[0];
  if (!budget) return [];
  const allTx = await db.select().from(transactions);
  return allTx.filter(
    (t) =>
      t.type === 'expense' &&
      t.categoryId === budget.categoryId &&
      (budget.subcategoryId === null || t.subcategoryId === budget.subcategoryId)
  );
}

export interface CreateBudgetInput {
  categoryId: string;
  subcategoryId: string | null;
  limitAmount: number;
}

export async function createBudget(db: Database, input: CreateBudgetInput): Promise<void> {
  await db.insert(budgets).values({
    id: generateId('bud'),
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    limitAmount: input.limitAmount,
    baseSpent: 0,
    raiseAmount: 0,
  });
}

export async function raiseBudget(db: Database, id: string, increment: number): Promise<void> {
  const rows = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  const budget = rows[0];
  if (!budget) return;
  await db.update(budgets).set({ raiseAmount: budget.raiseAmount + increment }).where(eq(budgets.id, id));
}

// Setting the amount directly supersedes raiseBudget's fixed-increment nudge for this budget:
// raiseAmount resets to 0 so the effective limit (limitAmount + raiseAmount) doesn't double-count.
export async function updateBudgetAmount(db: Database, id: string, limitAmount: number): Promise<void> {
  await db.update(budgets).set({ limitAmount, raiseAmount: 0 }).where(eq(budgets.id, id));
}

export async function findBudgetViewFor(db: Database, categoryId: string, subcategoryId: string | null): Promise<BudgetView | null> {
  const all = await db.select().from(budgets);
  const match = findBudgetFor(all, categoryId, subcategoryId);
  if (!match) return null;
  return toView(db, match);
}
