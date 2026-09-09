export interface LedgerTx {
  id: string;
  date: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  accountId: string;
  toAccountId: string | null;
}

export interface LedgerDay<T extends LedgerTx> {
  date: string;
  net: number;
  transactions: T[];
}

export type PeriodFilter = 'all' | 'week' | 'month';

export function isWithinPeriod(dateISO: string, period: PeriodFilter, todayISOValue: string, weekBounds: { start: string; end: string }): boolean {
  if (period === 'all') return true;
  if (period === 'month') return dateISO.slice(0, 7) === todayISOValue.slice(0, 7);
  return dateISO >= weekBounds.start && dateISO <= weekBounds.end;
}

export interface PeriodOptions {
  period: PeriodFilter;
  today: string;
  weekBounds: { start: string; end: string };
}

export function filterTransactions<T extends LedgerTx>(
  txs: readonly T[],
  typeFilter: 'all' | LedgerTx['type'],
  accountFilter: 'all' | string,
  periodOptions?: PeriodOptions
): T[] {
  return txs.filter(
    (t) =>
      (typeFilter === 'all' || t.type === typeFilter) &&
      (accountFilter === 'all' || t.accountId === accountFilter || t.toAccountId === accountFilter) &&
      (!periodOptions || isWithinPeriod(t.date, periodOptions.period, periodOptions.today, periodOptions.weekBounds))
  );
}

export function groupTransactionsByDay<T extends LedgerTx>(txs: readonly T[]): LedgerDay<T>[] {
  const byDate = new Map<string, T[]>();
  for (const tx of txs) {
    const bucket = byDate.get(tx.date) ?? [];
    bucket.push(tx);
    byDate.set(tx.date, bucket);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({
      date,
      net: list.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0),
      transactions: list,
    }));
}

export function monthlyTotals<T extends LedgerTx>(txs: readonly T[], monthKey: string): { income: number; expense: number } {
  const monthTx = txs.filter((t) => t.date.slice(0, 7) === monthKey);
  return {
    income: monthTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    expense: monthTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  };
}
