// Pure ledger domain logic (no DB / UI dependencies).
// Transactions are plain rows: { id, date: 'YYYY-MM-DD', kind, amount, timestamp?, ... }.
// Timezone: `date` is a calendar day string already in the user's local day, so month/day
// boundaries are decided by string prefix only — no Date parsing, hence no TZ drift.

// TODO(owner): transfers are currently excluded from spent/income. Flip this to change it.
export const COUNT_TRANSFERS = false

// Accepts 'YYYY-MM' (same as budgetStatus) or { year, month } with month 1-12.
export function monthKey(month) {
  if (typeof month === 'string') return month
  return `${String(month.year).padStart(4, '0')}-${String(month.month).padStart(2, '0')}`
}

const inMonth = (t, key) => t.date.slice(0, 7) === key

export function getMonthlySummary(transactions, month) {
  const key = monthKey(month)
  let spent = 0, income = 0
  for (const t of transactions) {
    if (!inMonth(t, key)) continue
    if (t.kind === 'expense') spent += t.amount
    else if (t.kind === 'income') income += t.amount
    else if (t.kind === 'transfer' && COUNT_TRANSFERS) spent += t.amount
  }
  return { spent, income, net: income - spent }
}

// Newest first. Uses `timestamp` (ISO string or number) when present, falling back to id.
const order = t => [t.timestamp == null ? '' : String(t.timestamp), t.id ?? 0]
const newestFirst = (a, b) => {
  const [ta, ia] = order(a), [tb, ib] = order(b)
  if (ta !== tb) return ta < tb ? 1 : -1
  return ib - ia
}

export function groupByDay(transactions, month) {
  const key = monthKey(month)
  const byDate = new Map()
  for (const t of transactions) {
    if (!inMonth(t, key)) continue
    if (!byDate.has(t.date)) byDate.set(t.date, [])
    byDate.get(t.date).push(t)
  }
  return [...byDate.keys()].sort().reverse()
    .map(date => ({ date, items: byDate.get(date).sort(newestFirst) }))
}
