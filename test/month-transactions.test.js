import { test } from 'node:test'; import assert from 'node:assert/strict'
import { openDb, seed } from '../src/db.js'
import { getMonthTransactions, createMonthTransactions, txStatus } from '../src/month-transactions.js'

function setup() {
  const db = openDb(); seed(db)
  const id = n => db.prepare('select id from categories where name=?').get(n).id
  const acc = n => db.prepare('select id from accounts where name=?').get(n).id
  const ins = db.prepare('insert into transactions(date,kind,amount,account_id,category_id,source,flag) values(?,?,?,?,?,?,?)')
  ins.run('2026-10-31', 'expense', 999, acc('BCA'), id('Food'), 'manual', null)
  ins.run('2026-11-01', 'expense', 100, acc('BCA'), id('Kopi'), 'auto', null)
  ins.run('2026-11-02', 'expense', 50, acc('GOPAY'), id('Shopping'), 'auto', 'review')
  ins.run('2026-11-02', 'income', 1000, acc('JAGO'), id('Salary'), 'manual', null)
  return db
}

test('mapping: category, sub-category, account, status', () => {
  const m = getMonthTransactions(setup(), '2026-11')
  assert.equal(m.length, 3)
  const kopi = m.find(t => t.amount === 100)
  assert.deepEqual([kopi.categoryIcon, kopi.subCategory, kopi.account, kopi.status], ['Food', 'Kopi', 'BCA', 'auto'])
  const shop = m.find(t => t.amount === 50)
  assert.deepEqual([shop.categoryIcon, shop.subCategory, shop.status], ['Shopping', null, 'review'])
  assert.equal(m.find(t => t.kind === 'income').status, 'normal')
})

test('txStatus: review beats auto; recurring/manual are normal', () => {
  assert.equal(txStatus({ source: 'auto', flag: 'review' }), 'review')
  assert.equal(txStatus({ source: 'recurring', flag: null }), 'normal')
})

test('month switch: reloads, derives summary/days, ignores stale responses', async () => {
  const db = setup()
  const store = createMonthTransactions(async k => getMonthTransactions(db, k), '2026-11')
  assert.equal(store.getState().status, 'loading')
  await store.setMonth('2026-11')
  let s = store.getState()
  assert.equal(s.status, 'ready')
  assert.deepEqual(s.summary, { spent: 150, income: 1000, net: 850 })
  assert.deepEqual(s.days.map(d => d.date), ['2026-11-02', '2026-11-01'])
  await store.setMonth('2026-10')
  s = store.getState()
  assert.equal(s.month, '2026-10')
  assert.deepEqual(s.summary, { spent: 999, income: 0, net: -999 })
  await store.setMonth('2026-09')
  assert.deepEqual(store.getState().days, [])

  // stale: slow first request resolves after the second
  let release
  const slow = createMonthTransactions(k => k === '2026-10' ? new Promise(r => { release = () => r(getMonthTransactions(db, k)) }) : getMonthTransactions(db, k), '2026-10')
  const p1 = slow.setMonth('2026-10')
  await slow.setMonth('2026-11')
  release(); await p1
  assert.equal(slow.getState().month, '2026-11')
  assert.equal(slow.getState().summary.spent, 150)
})

test('error state', async () => {
  const store = createMonthTransactions(async () => { throw new Error('boom') }, '2026-11')
  await store.setMonth('2026-11')
  assert.equal(store.getState().status, 'error')
  assert.equal(store.getState().error.message, 'boom')
})
