import { test } from 'node:test'; import assert from 'node:assert/strict'
import { start } from './helpers.js'
import { initialState, validate, MSG } from '../src/txform.js'

// Mirrors the form's submit: validate -> POST /api/transactions -> reload the Ledger month of the date.
const payload = f => ({ date: f.date, kind: f.type, amount: Number(f.amount), account_id: f.type === 'transfer' ? f.fromAccountId : f.accountId,
  to_account_id: f.type === 'transfer' ? f.toAccountId : null, category_id: f.type === 'transfer' ? null : (f.subCategoryId || f.categoryId), note: '' })
async function submit(s, f, post = (p) => s.call('POST', '/api/transactions', p)) {
  if (Object.keys(validate(f)).length) return { saved: false }
  const r = await post(payload(f))
  if (r.status !== 201) return { saved: false, failed: MSG.saveFailed }
  return { saved: true, month: f.date.slice(0, 7), tx: r.json }
}
const ledger = async (s, m) => (await s.call('GET', '/api/transactions?month=' + m)).json
const catId = (s, n) => s.db.prepare('select id from categories where name=?').get(n).id
const form = o => ({ ...initialState('2026-11-12'), amount: '5000', ...o })

test('save expense with sub-category, income, transfer -> visible in Ledger of their month', async () => {
  const s = await start(); await s.login()
  const e = await submit(s, form({ accountId: 1, categoryId: catId(s, 'Food'), subCategoryId: catId(s, 'Kopi') }))
  assert.equal(e.saved, true); assert.equal(e.tx.category_id, catId(s, 'Kopi'))
  const i = await submit(s, form({ type: 'income', accountId: 1, categoryId: catId(s, 'Salary') })); assert.equal(i.saved, true)
  const t = await submit(s, form({ type: 'transfer', fromAccountId: 1, toAccountId: 2 })); assert.equal(t.saved, true)
  const list = await ledger(s, '2026-11')
  assert.deepEqual(list.map(x => x.kind).sort(), ['expense', 'income', 'transfer'])
  assert.equal(list.find(x => x.kind === 'transfer').to_account_id, 2); s.close()
})

test('future date (tomorrow, next month) appears in the month of that date only', async () => {
  const s = await start(); await s.login()
  const r = await submit(s, form({ date: '2026-12-01', accountId: 1, categoryId: catId(s, 'Food') }))
  assert.equal(r.saved, true); assert.equal(r.month, '2026-12')
  assert.equal((await ledger(s, '2026-12')).length, 1); assert.equal((await ledger(s, '2026-11')).length, 0); s.close()
})

test('invalid input does not call the API', async () => {
  const s = await start(); await s.login()
  assert.equal((await submit(s, form({ amount: '0', accountId: 1, categoryId: catId(s, 'Food') }))).saved, false)
  assert.equal((await submit(s, form({ date: '2026-02-31', accountId: 1, categoryId: catId(s, 'Food') }))).saved, false)
  assert.equal((await submit(s, form({ type: 'transfer', fromAccountId: 1, toAccountId: 1 }))).saved, false)
  assert.equal((await ledger(s, '2026-11')).length, 0); s.close()
})

test('failed save reports error, keeps form data, and retry succeeds', async () => {
  const s = await start(); await s.login()
  const f = form({ accountId: 1, categoryId: catId(s, 'Food'), amount: '12345' }); const before = structuredClone(f)
  const bad = await submit(s, f, async () => ({ status: 500 }))
  assert.equal(bad.saved, false); assert.equal(bad.failed, 'Transaksi gagal disimpan. Silakan coba lagi.')
  assert.deepEqual(f, before); assert.equal((await ledger(s, '2026-11')).length, 0)
  const ok = await submit(s, f); assert.equal(ok.saved, true); assert.equal((await ledger(s, '2026-11')).length, 1); s.close()
})

test('cancel saves nothing, even with partially filled fields', async () => {
  const s = await start(); await s.login()
  form({ accountId: 1, amount: '999' }) // user fills some fields then presses Batal: no submit happens
  assert.equal((await ledger(s, '2026-11')).length, 0)
  assert.equal(s.db.prepare('select count(*) c from transactions').get().c, 0); s.close()
})
