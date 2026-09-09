import { filterTransactions, groupTransactionsByDay, monthlyTotals, isWithinPeriod } from '../ledgerLogic';

const txs = [
  { id: 't1', date: '2026-09-05', type: 'expense' as const, amount: 68000, accountId: 'a2', toAccountId: null },
  { id: 't2', date: '2026-09-05', type: 'expense' as const, amount: 245000, accountId: 'a1', toAccountId: null },
  { id: 't3', date: '2026-09-04', type: 'income' as const, amount: 12500000, accountId: 'a1', toAccountId: null },
  { id: 't4', date: '2026-09-04', type: 'transfer' as const, amount: 3000000, accountId: 'a1', toAccountId: 'a3' },
];

describe('filterTransactions', () => {
  test('"all" type and "all" account pass every transaction through', () => {
    expect(filterTransactions(txs, 'all', 'all')).toHaveLength(4);
  });

  test('filters by transaction type', () => {
    expect(filterTransactions(txs, 'expense', 'all').map((t) => t.id)).toEqual(['t1', 't2']);
  });

  test('an account filter matches both the source and the transfer destination', () => {
    expect(filterTransactions(txs, 'all', 'a3').map((t) => t.id)).toEqual(['t4']);
  });
});

describe('groupTransactionsByDay', () => {
  test('groups by date, newest day first, with a signed net per day', () => {
    const days = groupTransactionsByDay(txs);
    expect(days.map((d) => d.date)).toEqual(['2026-09-05', '2026-09-04']);
    expect(days[0].net).toBe(-313000); // two expenses, no income that day
    expect(days[1].net).toBe(12500000); // income minus a transfer, which is excluded from net
  });
});

describe('isWithinPeriod', () => {
  const weekBounds = { start: '2026-09-01', end: '2026-09-07' };

  test('"all" always passes', () => {
    expect(isWithinPeriod('2020-01-01', 'all', '2026-09-05', weekBounds)).toBe(true);
  });

  test('"month" matches same-month dates only', () => {
    expect(isWithinPeriod('2026-09-01', 'month', '2026-09-05', weekBounds)).toBe(true);
    expect(isWithinPeriod('2026-08-31', 'month', '2026-09-05', weekBounds)).toBe(false);
  });

  test('"week" matches dates within the given week bounds inclusive', () => {
    expect(isWithinPeriod('2026-09-01', 'week', '2026-09-05', weekBounds)).toBe(true);
    expect(isWithinPeriod('2026-09-07', 'week', '2026-09-05', weekBounds)).toBe(true);
    expect(isWithinPeriod('2026-09-08', 'week', '2026-09-05', weekBounds)).toBe(false);
  });
});

describe('filterTransactions with a period option', () => {
  test('narrows results to the given month on top of type/account filters', () => {
    const filtered = filterTransactions(txs, 'all', 'all', {
      period: 'month',
      today: '2026-09-05',
      weekBounds: { start: '2026-08-31', end: '2026-09-06' },
    });
    expect(filtered).toHaveLength(4);

    const augustOnly = filterTransactions(txs, 'all', 'all', {
      period: 'month',
      today: '2026-08-05',
      weekBounds: { start: '2026-08-03', end: '2026-08-09' },
    });
    expect(augustOnly).toHaveLength(0);
  });
});

describe('monthlyTotals', () => {
  test('sums income and expense for transactions within the given month only', () => {
    const totals = monthlyTotals(txs, '2026-09');
    expect(totals.income).toBe(12500000);
    expect(totals.expense).toBe(313000);
  });

  test('excludes transactions from other months', () => {
    expect(monthlyTotals(txs, '2026-08')).toEqual({ income: 0, expense: 0 });
  });
});
