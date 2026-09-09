import type { Database } from './client';
import { accounts, accountGroups, categories, subcategories, budgets, transactions, settings, goals, goalAccounts } from './schema';

export async function clearAllData(db: Database): Promise<void> {
  await db.delete(transactions);
  await db.delete(budgets);
  await db.delete(subcategories);
  await db.delete(categories);
  await db.delete(goalAccounts);
  await db.delete(goals);
  await db.delete(accounts);
  await db.delete(accountGroups);
  await db.delete(settings);
}
