// Data layer for the Ledger screen: month transactions with category, sub-category, account and status.
// Framework-agnostic: `createMonthTransactions` is the state holder behind a `useMonthTransactions(month)` hook
// (subscribe/getState fit React's useSyncExternalStore); summary and day groups come from ledger.js.
import { getMonthlySummary, groupByDay, monthKey } from './ledger.js'

// Review wins over auto: a flagged transaction needs the user's attention whatever created it.
export const txStatus = row => row.flag === 'review' ? 'review' : row.source === 'auto' ? 'auto' : 'normal'

// DB row (joined) -> ledger transaction. Categories have no icon column, so `categoryIcon`
// is the top-level category name, which the UI maps to an icon.
export function mapTransaction(r) {
  return {
    id: r.id,
    date: r.date,
    kind: r.kind,
    amount: r.amount,
    categoryIcon: r.parent_name ?? r.category_name ?? null,
    subCategory: r.parent_name ? r.category_name : null,
    category: r.parent_name ?? r.category_name ?? null,
    account: r.account_name ?? null,
    toAccount: r.to_account_name ?? null,
    note: r.note,
    status: txStatus(r),
  }
}

export function getMonthTransactions(db, month) {
  const rows = db.prepare(`select t.*, c.name category_name, p.name parent_name, a.name account_name, ta.name to_account_name
    from transactions t
    left join categories c on c.id = t.category_id
    left join categories p on p.id = c.parent_id
    left join accounts a on a.id = t.account_id
    left join accounts ta on ta.id = t.to_account_id
    where substr(t.date,1,7) = ? order by t.date desc, t.id desc`).all(monthKey(month))
  return rows.map(mapTransaction)
}

const derive = (transactions, month) => ({
  summary: getMonthlySummary(transactions, month),
  days: groupByDay(transactions, month),
})

// `fetchMonth(key)` resolves to mapped transactions for 'YYYY-MM'.
// State: { month, status: 'loading'|'ready'|'error', error, transactions, summary, days }.
export function createMonthTransactions(fetchMonth, initialMonth) {
  let seq = 0
  const listeners = new Set()
  let state = { month: monthKey(initialMonth), status: 'loading', error: null, transactions: [], ...derive([], initialMonth) }
  const set = patch => { state = { ...state, ...patch }; listeners.forEach(l => l()) }

  async function load(month) {
    const key = monthKey(month), my = ++seq
    // Clear stale data on month switch so the old month never shows under the new one.
    set({ month: key, status: 'loading', error: null, transactions: [], ...derive([], key) })
    try {
      const transactions = await fetchMonth(key)
      if (my === seq) set({ status: 'ready', transactions, ...derive(transactions, key) })
    } catch (error) {
      if (my === seq) set({ status: 'error', error })
    }
  }

  return {
    getState: () => state,
    subscribe: l => (listeners.add(l), () => listeners.delete(l)),
    setMonth: load,
    reload: () => load(state.month),
  }
}
