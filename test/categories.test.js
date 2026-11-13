import { test } from 'node:test'; import assert from 'node:assert/strict'
import { openDb, seed } from '../src/db.js'
import { accountBalance, budgetStatus, totals } from '../src/calc.js'
import { addCategory, updateCategory, deleteCategory, addSub, updateSub, deleteSub, listCategoryTree, UNCATEGORIZED_NAME } from '../src/categories.js'

const setup = () => { const db = openDb(); seed(db); return db }
const id = (db, n) => db.prepare('select id from categories where name=?').get(n).id
const txCount = db => db.prepare('select count(*) c from transactions').get().c
const addTx = (db, cat, amount = 1000) =>
  db.prepare("insert into transactions(date,kind,amount,account_id,category_id) values('2026-11-05','expense',?,1,?)").run(amount, cat)

test('Uncategorized / Other exists per type and is protected', () => {
  const db = setup()
  for (const t of ['expense', 'income']) {
    const u = listCategoryTree(db, t).find(c => c.name === UNCATEGORIZED_NAME)
    assert.ok(u, t)
    assert.equal(updateCategory(db, u.id, { name: 'X' }).ok, false)
    assert.equal(deleteCategory(db, u.id).ok, false)
    assert.equal(addSub(db, u.id, { name: 'Y' }).ok, false)
  }
})

test('name is trimmed; empty and duplicate (case-insensitive) rejected', () => {
  const db = setup()
  assert.equal(addCategory(db, { name: '   ', type: 'expense' }).error.message, 'Nama tidak boleh kosong')
  const r = addCategory(db, { name: '  Health ', type: 'expense' })
  assert.equal(r.category.name, 'Health')
  assert.equal(addCategory(db, { name: 'health', type: 'expense' }).error.message, 'Nama sudah dipakai')
  assert.equal(addCategory(db, { name: 'health', type: 'income' }).ok, true) // other type is fine
  assert.equal(updateCategory(db, r.category.id, { name: 'FOOD' }).error.code, 'duplicate')
  const food = id(db, 'Food')
  assert.equal(addSub(db, food, { name: 'kopi' }).error.code, 'duplicate')
  assert.equal(addSub(db, food, { name: '' }).error.code, 'empty')
  assert.equal(addSub(db, id(db, 'Transport'), { name: 'kopi' }).ok, true) // other category is fine
})

test('rename category and sub; renaming to own name is allowed', () => {
  const db = setup()
  const food = id(db, 'Food')
  assert.equal(updateCategory(db, food, { name: 'Eats' }).category.name, 'Eats')
  assert.equal(updateCategory(db, food, { name: 'eats' }).ok, true)
  const kopi = id(db, 'Kopi')
  assert.equal(updateSub(db, kopi, { name: 'Coffee' }).sub.name, 'Coffee')
  const tree = listCategoryTree(db, 'expense').find(c => c.id === food)
  assert.deepEqual(tree.subs.map(s => s.name), ['Coffee', 'Makan'])
})

test('delete sub with transactions moves them to Uncategorized, none lost', () => {
  const db = setup()
  addTx(db, id(db, 'Kopi')); addTx(db, id(db, 'Kopi'))
  const before = txCount(db)
  const r = deleteSub(db, id(db, 'Kopi'))
  assert.equal(r.movedTransactions, 2)
  assert.equal(txCount(db), before)
  const other = listCategoryTree(db, 'expense').find(c => c.name === UNCATEGORIZED_NAME).id
  assert.equal(db.prepare('select count(*) c from transactions where category_id=?').get(other).c, 2)
})

test('delete category moves its own and its subs transactions; recurring too', () => {
  const db = setup()
  addTx(db, id(db, 'Food')); addTx(db, id(db, 'Makan'))
  db.prepare("insert into recurring(kind,amount,account_id,category_id,day_of_month) values('expense',500,1,?,1)").run(id(db, 'Food'))
  const before = txCount(db)
  assert.equal(deleteCategory(db, id(db, 'Food')).movedTransactions, 2)
  assert.equal(txCount(db), before)
  const other = listCategoryTree(db, 'expense').find(c => c.name === UNCATEGORIZED_NAME).id
  assert.equal(db.prepare('select count(*) c from transactions where category_id=?').get(other).c, 2)
  assert.equal(db.prepare('select category_id c from recurring').get().c, other)
  assert.equal(db.prepare('select count(*) c from categories where name in (?,?)').get('Food', 'Makan').c, 0)
})

test('income category delete goes to the income Uncategorized', () => {
  const db = setup()
  db.prepare("insert into transactions(date,kind,amount,account_id,category_id) values('2026-11-01','income',5000,1,?)").run(id(db, 'Salary'))
  deleteCategory(db, id(db, 'Salary'))
  const other = listCategoryTree(db, 'income').find(c => c.name === UNCATEGORIZED_NAME).id
  assert.equal(db.prepare('select category_id c from transactions').get().c, other)
})

test('budget moves to Uncategorized; account balance unchanged', () => {
  const db = setup()
  addTx(db, id(db, 'Food'), 7000)
  const bal = accountBalance(db, 1), tot = totals(db)
  const used = n => budgetStatus(db, '2026-11').find(b => b.name === n)?.used
  assert.equal(used('Food'), 7000)
  deleteCategory(db, id(db, 'Food'))
  assert.equal(used('Food'), undefined)
  assert.equal(used(UNCATEGORIZED_NAME), 7000)
  assert.equal(accountBalance(db, 1), bal)
  assert.deepEqual(totals(db), tot)
})
