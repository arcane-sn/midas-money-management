const sum = (db, sql, ...p) => db.prepare(sql).get(...p).s ?? 0

export function accountBalance(db, id) {
  const open = sum(db, 'select opening_balance s from accounts where id=?', id)
  const k = kind => sum(db, 'select sum(amount) s from transactions where account_id=? and kind=?', id, kind)
  const inn = sum(db, "select sum(amount) s from transactions where to_account_id=? and kind='transfer'", id)
  return open + k('income') - k('expense') - k('transfer') + inn
}

export function budgetStatus(db, month) {
  return db.prepare(`select c.id categoryId, c.name, c.monthly_budget budget,
    coalesce((select sum(t.amount) from transactions t join categories x on x.id=t.category_id
      where t.kind='expense' and substr(t.date,1,7)=? and (x.id=c.id or x.parent_id=c.id)),0) used
    from categories c where c.parent_id is null and c.kind='expense' order by c.id`).all(month)
    .map(r => ({ ...r, remaining: r.budget - r.used }))
}

export function totals(db) {
  let assets = 0, liabilities = 0
  for (const a of db.prepare('select id,type from accounts').all()) {
    const b = accountBalance(db, a.id)
    if (a.type === 'asset') assets += b; else liabilities += b
  }
  return { assets, liabilities, total: assets + liabilities }
}
