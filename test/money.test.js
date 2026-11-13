import { test } from 'node:test'; import assert from 'node:assert/strict'
import { fmtRupiah } from '../src/money.js'

test('fmtRupiah: positive, zero, decimals', () => {
  assert.equal(fmtRupiah(10000), 'Rp 10.000,00')
  assert.equal(fmtRupiah(0), 'Rp 0,00')
  assert.equal(fmtRupiah(1234567.5), 'Rp 1.234.567,50')
  assert.equal(fmtRupiah('2500'), 'Rp 2.500,00')
})
test('fmtRupiah: negative', () => {
  assert.equal(fmtRupiah(-5000), '-Rp 5.000,00')
  assert.equal(fmtRupiah(-0.001), 'Rp 0,00')
})
test('fmtRupiah: null/undefined/NaN treated as 0', () => {
  for (const v of [null, undefined, NaN, 'abc']) assert.equal(fmtRupiah(v), 'Rp 0,00')
})
