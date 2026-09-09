import type { Database } from './client';
import { accounts, accountGroups, categories, subcategories, budgets, transactions, settings, goals, goalAccounts } from './schema';

export const BACKUP_VERSION = 1;

export async function buildBackupPayload(db: Database) {
  const [accountsRows, groupsRows, categoriesRows, subcategoriesRows, budgetsRows, transactionsRows, settingsRows, goalsRows, goalAccountsRows] =
    await Promise.all([
      db.select().from(accounts),
      db.select().from(accountGroups),
      db.select().from(categories),
      db.select().from(subcategories),
      db.select().from(budgets),
      db.select().from(transactions),
      db.select().from(settings),
      db.select().from(goals),
      db.select().from(goalAccounts),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    version: BACKUP_VERSION,
    accounts: accountsRows,
    accountGroups: groupsRows,
    categories: categoriesRows,
    subcategories: subcategoriesRows,
    budgets: budgetsRows,
    transactions: transactionsRows,
    settings: settingsRows,
    goals: goalsRows,
    goalAccounts: goalAccountsRows,
  };
}
