import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { accounts, accountGroups, transactions } from '../schema';
import { computeNetWorth } from './netWorth';
import { currentMonthKey } from '../../utils/date';
import { generateId } from '../../utils/id';

export type Account = typeof accounts.$inferSelect;

export async function listAccounts(db: Database): Promise<Account[]> {
  return db.select().from(accounts);
}

export async function getAccount(db: Database, id: string): Promise<Account | null> {
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface AccountGroupView {
  label: string;
  total: number;
  accounts: Account[];
}

export interface AccountsOverview {
  assets: AccountGroupView[];
  liabilities: AccountGroupView[];
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
}

function groupByLabel(list: Account[]): AccountGroupView[] {
  const byLabel = new Map<string, Account[]>();
  for (const acc of list) {
    const bucket = byLabel.get(acc.groupLabel) ?? [];
    bucket.push(acc);
    byLabel.set(acc.groupLabel, bucket);
  }
  return Array.from(byLabel.entries()).map(([label, accs]) => ({
    label,
    total: accs.reduce((sum, a) => sum + a.balance, 0),
    accounts: accs,
  }));
}

export async function getAccountsOverview(db: Database): Promise<AccountsOverview> {
  const all = await listAccounts(db);
  const { assetsTotal, liabilitiesTotal, netWorth } = computeNetWorth(all);
  return {
    assets: groupByLabel(all.filter((a) => a.kind === 'assets')),
    liabilities: groupByLabel(all.filter((a) => a.kind === 'liabilities')),
    assetsTotal,
    liabilitiesTotal,
    netWorth,
  };
}

export interface AccountDetail {
  account: Account;
  inMonth: number;
  outMonth: number;
  transactions: (typeof transactions.$inferSelect)[];
}

export async function getAccountDetail(db: Database, id: string): Promise<AccountDetail | null> {
  const account = await getAccount(db, id);
  if (!account) return null;
  const all = await db.select().from(transactions);
  const related = all.filter((t) => t.accountId === id || t.toAccountId === id);
  const monthKey = currentMonthKey();
  const monthTx = related.filter((t) => t.date.slice(0, 7) === monthKey);
  const inMonth = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const outMonth = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { account, inMonth, outMonth, transactions: related };
}

export interface CreateAccountInput {
  name: string;
  kind: 'assets' | 'liabilities';
  groupLabel: string;
  balance: number;
  description?: string;
}

export async function createAccount(db: Database, input: CreateAccountInput): Promise<Account> {
  const row = {
    id: generateId('acc'),
    name: input.name,
    kind: input.kind,
    groupLabel: input.groupLabel,
    balance: input.balance,
    description: input.description ?? null,
  };
  await db.insert(accounts).values(row);
  return row;
}

export async function listAccountGroups(db: Database, kind: 'assets' | 'liabilities'): Promise<string[]> {
  const rows = await db.select().from(accountGroups).where(eq(accountGroups.kind, kind));
  return rows.map((r) => r.label);
}

export async function createAccountGroup(db: Database, kind: 'assets' | 'liabilities', label: string): Promise<void> {
  const id = `${kind}__${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  const existing = await db.select().from(accountGroups).where(eq(accountGroups.id, id)).limit(1);
  if (existing.length > 0) return;
  await db.insert(accountGroups).values({ id, kind, label, isBuiltIn: false });
}

export type AccountGroupRow = typeof accountGroups.$inferSelect;

export async function listAllAccountGroups(db: Database): Promise<AccountGroupRow[]> {
  return db.select().from(accountGroups);
}

export async function getAccountGroup(db: Database, id: string): Promise<AccountGroupRow | null> {
  const rows = await db.select().from(accountGroups).where(eq(accountGroups.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function renameAccountGroup(db: Database, id: string, newLabel: string): Promise<void> {
  const group = await getAccountGroup(db, id);
  const label = newLabel.trim();
  if (!group || !label || label === group.label) return;
  await db.update(accountGroups).set({ label }).where(eq(accountGroups.id, id));
  await db
    .update(accounts)
    .set({ groupLabel: label })
    .where(and(eq(accounts.kind, group.kind), eq(accounts.groupLabel, group.label)));
}

export interface UpdateAccountDetailsInput {
  name: string;
  kind: 'assets' | 'liabilities';
  groupLabel: string;
  description?: string;
}

export async function updateAccountDetails(db: Database, id: string, input: UpdateAccountDetailsInput): Promise<void> {
  await db
    .update(accounts)
    .set({ name: input.name, kind: input.kind, groupLabel: input.groupLabel, description: input.description ?? null })
    .where(eq(accounts.id, id));
}
