// Pure Stats aggregation for the Insights screen (no DB / UI dependencies).
// Input: transactions of the selected month (ledger shape: { kind, amount, category }).
// Output: { pengeluaran, pemasukan, isEmpty }, each section { total, categories: [{ name, total, percent }] }.
// Transfers are ignored; expense and income are aggregated separately and never mixed.

const UNCATEGORIZED = 'Uncategorized'

function aggregate(transactions, kind) {
  const byName = new Map()
  let total = 0
  for (const t of transactions) {
    if (t.kind !== kind) continue
    const name = t.category ?? UNCATEGORIZED
    byName.set(name, (byName.get(name) ?? 0) + t.amount)
    total += t.amount
  }
  const categories = [...byName]
    .map(([name, sum]) => ({ name, total: sum, percent: total > 0 ? Math.round((sum / total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  return { total, categories }
}

export function getStats(transactions) {
  const pengeluaran = aggregate(transactions, 'expense')
  const pemasukan = aggregate(transactions, 'income')
  // noStats: the month has no expense or income transaction at all.
  const isEmpty = pengeluaran.categories.length === 0 && pemasukan.categories.length === 0
  return { pengeluaran, pemasukan, isEmpty }
}
