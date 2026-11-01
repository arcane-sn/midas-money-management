import { test } from 'node:test'; import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { accountBalance, budgetStatus, totals } from '../src/calc.js'
function setup() {
  const db = openDb()
  db.exec(`insert into account_groups(name,type) values('BANK','asset'),('Mortgage','liability');
   insert into accounts(name,group_id,type,opening_balance) values('A',1,'asset',1000),('B',1,'asset',0),('KPR',2,'liability',0);
   insert into categories(name,kind,monthly_budget) values('Food','expense',1000);
   insert into categories(name,kind,parent_id) values('Kopi','expense',1)`)
  return db
}
const tx = (db, kind, amount, a, o = {}) => db.prepare(
  'insert into transactions(date,kind,amount,account_id,to_account_id,category_id) values(?,?,?,?,?,?)'
).run(o.date ?? '2026-11-01', kind, amount, a, o.to ?? null, o.cat ?? null).lastInsertRowid
test('balance = opening + income - expense', () => {
  const db = setup(); tx(db, 'income', 500, 1); tx(db, 'expense', 200, 1)
  assert.equal(accountBalance(db, 1), 1300)
})
test('transfer moves money, not counted in budget', () => {
  const db = setup(); tx(db, 'transfer', 300, 1, { to: 2 })
  assert.equal(accountBalance(db, 1), 700); assert.equal(accountBalance(db, 2), 300)
  assert.equal(budgetStatus(db, '2026-11')[0].used, 0)
})
test('liability goes negative; totals split', () => {
  const db = setup(); tx(db, 'expense', 100, 3)
  assert.equal(accountBalance(db, 3), -100)
  const t = totals(db); assert.equal(t.liabilities, -100); assert.equal(t.assets, 1000); assert.equal(t.total, 900)
})
test('subcategory counts toward parent; month filtered; edit/delete recomputes', () => {
  const db = setup(); const id = tx(db, 'expense', 400, 1, { cat: 2 }); tx(db, 'expense', 50, 1, { cat: 1 }); tx(db, 'expense', 999, 1, { cat: 1, date: '2026-10-31' })
  let b = budgetStatus(db, '2026-11')[0]; assert.deepEqual([b.budget, b.used, b.remaining], [1000, 450, 550])
  db.prepare('update transactions set amount=100 where id=?').run(id)
  assert.equal(budgetStatus(db, '2026-11')[0].used, 150)
  db.prepare('delete from transactions where id=?').run(id)
  assert.equal(accountBalance(db, 1), 1000 - 50 - 999)
})
