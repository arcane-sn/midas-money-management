import { test } from 'node:test'; import assert from 'node:assert/strict'
import { initialState, validate, isValid, reduce, isValidDate, todayLocal, MSG } from '../src/txform.js'

const ok = (o = {}) => ({ ...initialState('2026-11-12'), amount: '10000', accountId: 1, categoryId: 2, ...o })
const okTransfer = (o = {}) => ({ ...initialState('2026-11-12'), type: 'transfer', amount: '10000', fromAccountId: 1, toAccountId: 2, ...o })

test('initial state: expense, today', () => {
  const s = initialState()
  assert.equal(s.type, 'expense'); assert.equal(s.date, todayLocal())
})
test('valid expense/income/transfer have no errors; subcategory optional', () => {
  assert.deepEqual(validate(ok()), {}); assert.deepEqual(validate(ok({ type: 'income' })), {})
  assert.deepEqual(validate(ok({ subCategoryId: null })), {}); assert.deepEqual(validate(okTransfer()), {})
})
test('amount empty / 0 / negative / non-numeric', () => {
  for (const a of ['', '0', 0, '-5', -1, 'abc', null]) assert.equal(validate(ok({ amount: a })).amount, 'Nominal harus lebih dari 0.')
})
test('date empty / invalid / future', () => {
  assert.equal(validate(ok({ date: '' })).date, 'Tanggal wajib diisi.')
  assert.equal(validate(ok({ date: '2026-02-31' })).date, 'Tanggal tidak valid.')
  assert.equal(validate(ok({ date: 'garbage' })).date, 'Tanggal tidak valid.')
  assert.equal(isValidDate('2024-02-29'), true); assert.equal(isValidDate('2025-02-29'), false)
  assert.deepEqual(validate(ok({ date: '2026-11-13' })), {}) // tomorrow
})
test('expense/income: account and category required', () => {
  for (const type of ['expense', 'income']) {
    assert.equal(validate(ok({ type, accountId: null })).accountId, 'Akun wajib dipilih.')
    assert.equal(validate(ok({ type, categoryId: null })).categoryId, 'Kategori wajib dipilih.')
  }
})
test('transfer: from/to required, must differ, category ignored', () => {
  assert.equal(validate(okTransfer({ fromAccountId: null })).fromAccountId, 'Akun asal wajib dipilih.')
  assert.equal(validate(okTransfer({ toAccountId: null })).toAccountId, 'Akun tujuan wajib dipilih.')
  assert.equal(validate(okTransfer({ toAccountId: 1 })).toAccountId, 'Akun tujuan tidak boleh sama dengan akun asal.')
  assert.equal(validate(okTransfer({ toAccountId: '1' })).toAccountId, MSG.sameAccount)
  const e = validate(okTransfer({ accountId: null, categoryId: null }))
  assert.deepEqual(e, {}); assert.equal(isValid(okTransfer()), true)
})
test('reducer: type change resets category/subcategory; category change clears sub', () => {
  let s = ok({ subCategoryId: 5 })
  s = reduce(s, { type: 'setCategory', value: 3 }); assert.equal(s.categoryId, 3); assert.equal(s.subCategoryId, null)
  s = reduce({ ...s, subCategoryId: 7 }, { type: 'setType', value: 'income' })
  assert.deepEqual([s.type, s.categoryId, s.subCategoryId], ['income', null, null]); assert.equal(s.amount, '10000')
  s = reduce(s, { type: 'set', field: 'amount', value: '5' }); assert.equal(s.amount, '5')
  assert.equal(reduce(s, { type: 'setType', value: 'bogus' }).type, 'income')
})
