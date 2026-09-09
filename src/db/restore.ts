import type { Database } from './client';
import { accounts, accountGroups, categories, subcategories, budgets, transactions, settings, goals, goalAccounts } from './schema';
import { clearAllData } from './reset';

export interface BackupPayload {
  version: number;
  accountGroups: (typeof accountGroups.$inferInsert)[];
  accounts: (typeof accounts.$inferInsert)[];
  categories: (typeof categories.$inferInsert)[];
  subcategories: (typeof subcategories.$inferInsert)[];
  budgets: (typeof budgets.$inferInsert)[];
  goals: (typeof goals.$inferInsert)[];
  goalAccounts: (typeof goalAccounts.$inferInsert)[];
  transactions: (typeof transactions.$inferInsert)[];
  settings: (typeof settings.$inferInsert)[];
}

const REQUIRED_ARRAY_KEYS = [
  'accountGroups',
  'accounts',
  'categories',
  'subcategories',
  'budgets',
  'transactions',
  'settings',
] as const;

function hasBackupShape(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.version !== 'number') return false;
  return REQUIRED_ARRAY_KEYS.every((key) => Array.isArray(record[key]));
}

export function parseBackupPayload(raw: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!hasBackupShape(parsed)) {
    throw new Error('That file does not look like a Midas backup.');
  }
  return {
    version: parsed.version as number,
    accountGroups: parsed.accountGroups as BackupPayload['accountGroups'],
    accounts: parsed.accounts as BackupPayload['accounts'],
    categories: parsed.categories as BackupPayload['categories'],
    subcategories: parsed.subcategories as BackupPayload['subcategories'],
    budgets: parsed.budgets as BackupPayload['budgets'],
    goals: Array.isArray(parsed.goals) ? (parsed.goals as BackupPayload['goals']) : [],
    goalAccounts: Array.isArray(parsed.goalAccounts) ? (parsed.goalAccounts as BackupPayload['goalAccounts']) : [],
    transactions: parsed.transactions as BackupPayload['transactions'],
    settings: parsed.settings as BackupPayload['settings'],
  };
}

// Overwrites every local table with the backup's contents — this is a replace,
// not a merge, so anything entered since the backup was made is discarded.
export async function restoreBackupPayload(db: Database, payload: BackupPayload): Promise<void> {
  await clearAllData(db);
  if (payload.accountGroups.length) await db.insert(accountGroups).values(payload.accountGroups);
  if (payload.accounts.length) await db.insert(accounts).values(payload.accounts);
  if (payload.categories.length) await db.insert(categories).values(payload.categories);
  if (payload.subcategories.length) await db.insert(subcategories).values(payload.subcategories);
  if (payload.budgets.length) await db.insert(budgets).values(payload.budgets);
  if (payload.goals.length) await db.insert(goals).values(payload.goals);
  if (payload.goalAccounts.length) await db.insert(goalAccounts).values(payload.goalAccounts);
  if (payload.transactions.length) await db.insert(transactions).values(payload.transactions);
  if (payload.settings.length) await db.insert(settings).values(payload.settings);
}
