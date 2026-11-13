import { test } from 'node:test'; import assert from 'node:assert/strict'
import { openDb, seed } from '../src/db.js'
import { listAccounts, listCategories, listSubCategories, createTransaction } from '../src/transactions.js'
const setup = () => { const db = openDb(); seed(db); return db }
const cat = (db, n) => db.prepare('select id from categories where name=?').get(n).id

test('accounts listed', () => assert.equal(listAccounts(setup()).length, 5))
test('categories filtered by type', () => {
  const db = setup()
  assert.ok(listCategories(db, 'expense').every(c => c.kind === 'expense' && !c.parent_id))
  assert.deepEqual(listCategories(db, 'income').map(c => c.name), ['Salary'])
  assert.deepEqual(listCategories(db, 'transfer'), [])
})
test('sub-categories only for selected category', () => {
  const db = setup()
  assert.deepEqual(listSubCategories(db, cat(db, 'Food')).map(s => s.name), ['Kopi', 'Makan'])
  assert.deepEqual(listSubCategories(db, cat(db, 'Transport')).map(s => s.name), ['Ojol'])
  assert.deepEqual(listSubCategories(db, null), [])
})
test('save expense with sub-category; appears in month listing', () => {
  const db = setup()
  const tx = createTransaction(db, { kind: 'expense', amount: 5000, date: '2027-01-15', account_id: 1, category_id: cat(db, 'Food'), sub_category_id: cat(db, 'Kopi') })
  assert.equal(tx.category_id, cat(db, 'Kopi'))
  assert.equal(db.prepare("select count(*) c from transactions where substr(date,1,7)='2027-01'").get().c, 1)
})
test('save without sub-category and transfer', () => {
  const db = setup()
  assert.equal(createTransaction(db, { kind: 'income', amount: 1, date: '2026-11-12', account_id: 1, category_id: cat(db, 'Salary') }).to_account_id, null)
  const t = createTransaction(db, { kind: 'transfer', amount: 10, date: '2026-11-12', account_id: 1, to_account_id: 2 })
  assert.equal(t.to_account_id, 2); assert.equal(t.category_id, null)
})
test('failures throw and save nothing', () => {
  const db = setup()
  const base = { kind: 'expense', amount: 100, date: '2026-11-12', account_id: 1, category_id: cat(db, 'Food') }
  for (const bad of [{ amount: 0 }, { amount: -5 }, { date: '' }, { date: '2026-02-31' }, { account_id: null }, { category_id: null },
    { sub_category_id: cat(db, 'Ojol') }, { kind: 'transfer', to_account_id: 1 }, { kind: 'transfer', to_account_id: null }, { account_id: 999 }])
    assert.throws(() => createTransaction(db, { ...base, ...bad }))
  assert.equal(db.prepare('select count(*) c from transactions').get().c, 0)
})
