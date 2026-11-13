// Data access for the "Transaksi Baru" form: selectors + createTransaction.

export const listAccounts = db => db.prepare('select * from accounts order by group_id, id').all()

// Top-level categories for a type ('expense' | 'income'); transfer has none.
export function listCategories(db, kind) {
  if (!['expense', 'income'].includes(kind)) return []
  return db.prepare('select * from categories where kind=? and parent_id is null order by id').all(kind)
}

// Sub-categories belonging only to the given category.
export function listSubCategories(db, categoryId) {
  if (!categoryId) return []
  return db.prepare('select * from categories where parent_id=? order by id').all(categoryId)
}

const fail = m => new Error(m)

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s ?? '')) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

// payload: { kind, amount, date, account_id, to_account_id?, category_id?, sub_category_id?, note? }
// Returns the saved transaction row (its date's month is what Ledger filters on); throws on failure.
export function createTransaction(db, payload) {
  const p = payload ?? {}
  if (!['income', 'expense', 'transfer'].includes(p.kind)) throw fail('kind')
  if (!Number.isInteger(p.amount) || p.amount <= 0) throw fail('amount must be a positive integer')
  if (!validDate(p.date)) throw fail('date invalid')
  if (!p.account_id) throw fail('account required')
  let to = null, cat = null
  if (p.kind === 'transfer') {
    if (!p.to_account_id || p.to_account_id === p.account_id) throw fail('transfer needs two different accounts')
    to = p.to_account_id
  } else {
    if (!p.category_id) throw fail('category required')
    cat = p.category_id
    if (p.sub_category_id) {
      const sub = db.prepare('select parent_id from categories where id=?').get(p.sub_category_id)
      if (!sub || sub.parent_id !== p.category_id) throw fail('sub-category does not belong to category')
      cat = p.sub_category_id
    }
  }
  const out = db.prepare('insert into transactions(date,kind,amount,account_id,to_account_id,category_id,note) values(?,?,?,?,?,?,?) returning *')
    .get(p.date, p.kind, p.amount, p.account_id, to, cat, p.note ?? '')
  return out
}
