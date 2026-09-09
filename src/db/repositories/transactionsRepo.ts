import { desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../client';
import { transactions, accounts, subcategories } from '../schema';
import { filterTransactions, groupTransactionsByDay, monthlyTotals, type LedgerDay, type PeriodFilter } from './ledgerLogic';
import { generateId } from '../../utils/id';
import type { TransactionType } from '../schema';
import { currentMonthKey, todayISO, startOfWeekISO, endOfWeekISO } from '../../utils/date';

export type Transaction = typeof transactions.$inferSelect;

export async function listTransactions(db: Database): Promise<Transaction[]> {
  return db.select().from(transactions);
}

export async function listRecentTransactions(db: Database, limit = 4): Promise<Transaction[]> {
  const all = await db.select().from(transactions).orderBy(desc(transactions.date));
  return all.slice(0, limit);
}

export async function getCurrentMonthTotals(db: Database) {
  const all = await listTransactions(db);
  return monthlyTotals(all, currentMonthKey());
}

export interface LedgerView {
  days: LedgerDay<Transaction>[];
  isEmpty: boolean;
}

export async function getLedger(
  db: Database,
  typeFilter: 'all' | Transaction['type'],
  accountFilter: 'all' | string,
  periodFilter: PeriodFilter = 'all'
): Promise<LedgerView> {
  const all = await listTransactions(db);
  const today = todayISO();
  const filtered = filterTransactions(all, typeFilter, accountFilter, {
    period: periodFilter,
    today,
    weekBounds: { start: startOfWeekISO(today), end: endOfWeekISO(today) },
  });
  const days = groupTransactionsByDay(filtered);
  return { days, isEmpty: filtered.length === 0 };
}

export async function accountNameLookup(db: Database): Promise<Map<string, string>> {
  const all = await db.select().from(accounts);
  return new Map(all.map((a) => [a.id, a.name]));
}

export async function subcategoryNameLookup(db: Database): Promise<Map<string, string>> {
  const all = await db.select().from(subcategories);
  return new Map(all.map((s) => [s.id, s.name]));
}

export interface CreateTransactionInput {
  date: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  note?: string | null;
}

interface BalanceEffectTx {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string | null;
}

// sign=1 applies the transaction's effect on account balances, sign=-1 undoes it.
// Shared by createTransaction and updateTransaction so edits stay consistent with creates.
async function applyTransactionBalanceEffect(db: Database, tx: BalanceEffectTx, sign: 1 | -1): Promise<void> {
  if (tx.type === 'expense') {
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${sign * tx.amount}` })
      .where(eq(accounts.id, tx.accountId));
  } else if (tx.type === 'income') {
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${sign * tx.amount}` })
      .where(eq(accounts.id, tx.accountId));
  } else if (tx.type === 'transfer' && tx.toAccountId) {
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${sign * tx.amount}` })
      .where(eq(accounts.id, tx.accountId));
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${sign * tx.amount}` })
      .where(eq(accounts.id, tx.toAccountId));
  }
}

export async function createTransaction(db: Database, input: CreateTransactionInput): Promise<Transaction> {
  const row = {
    id: generateId('tx'),
    date: input.date,
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    categoryId: input.categoryId ?? null,
    subcategoryId: input.subcategoryId ?? null,
    note: input.note ?? null,
  };
  // Not wrapped in db.transaction(): the installed expo-sqlite driver rc runs
  // transaction callbacks synchronously and rejects an async callback body.
  // A local single-writer app can tolerate the small non-atomicity window.
  await db.insert(transactions).values(row);
  await applyTransactionBalanceEffect(db, row, 1);
  return row;
}

export async function getTransaction(db: Database, id: string): Promise<Transaction | null> {
  const rows = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateTransaction(db: Database, id: string, input: CreateTransactionInput): Promise<void> {
  const old = await getTransaction(db, id);
  if (!old) return;
  await applyTransactionBalanceEffect(db, old, -1);
  await db
    .update(transactions)
    .set({
      date: input.date,
      type: input.type,
      amount: input.amount,
      accountId: input.accountId,
      toAccountId: input.toAccountId ?? null,
      categoryId: input.categoryId ?? null,
      subcategoryId: input.subcategoryId ?? null,
      note: input.note ?? null,
    })
    .where(eq(transactions.id, id));
  await applyTransactionBalanceEffect(
    db,
    { type: input.type, amount: input.amount, accountId: input.accountId, toAccountId: input.toAccountId },
    1
  );
}
