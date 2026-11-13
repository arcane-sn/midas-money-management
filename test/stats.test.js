import { test } from 'node:test'; import assert from 'node:assert/strict'
import { getStats } from '../src/stats.js'

const tx = (kind, amount, category) => ({ kind, amount, category })
const sample = [
  tx('expense', 100, 'Food'), tx('expense', 300, 'Transport'), tx('expense', 100, 'Food'),
  tx('expense', 100, 'Shopping'),
  tx('income', 1000, 'Salary'), tx('income', 250, 'Bonus'),
  tx('transfer', 500, null),
]

test('total per category is correct', () => {
  const s = getStats(sample)
  assert.equal(s.pengeluaran.total, 600)
  assert.deepEqual(s.pengeluaran.categories.map(c => [c.name, c.total]), [['Transport', 300], ['Food', 200], ['Shopping', 100]])
  assert.equal(s.pemasukan.total, 1250)
})

test('percent is relative to section total and sums close to 100', () => {
  const s = getStats(sample)
  assert.deepEqual(s.pengeluaran.categories.map(c => c.percent), [50, 33, 17])
  assert.deepEqual(s.pemasukan.categories.map(c => c.percent), [80, 20])
  const sum = s.pengeluaran.categories.reduce((a, c) => a + c.percent, 0)
  assert.ok(Math.abs(sum - 100) <= 2)
})

test('categories sorted largest to smallest', () => {
  const totals = getStats(sample).pengeluaran.categories.map(c => c.total)
  assert.deepEqual(totals, [...totals].sort((a, b) => b - a))
})

test('expense and income are separate; transfers ignored', () => {
  const s = getStats([tx('expense', 10, 'Food'), tx('income', 20, 'Food'), tx('transfer', 99, null)])
  assert.deepEqual(s.pengeluaran, { total: 10, categories: [{ name: 'Food', total: 10, percent: 100 }] })
  assert.deepEqual(s.pemasukan, { total: 20, categories: [{ name: 'Food', total: 20, percent: 100 }] })
})

test('empty state: no transactions, no divide-by-zero', () => {
  const s = getStats([])
  assert.equal(s.isEmpty, true)
  assert.deepEqual(s.pengeluaran, { total: 0, categories: [] })
  assert.deepEqual(s.pemasukan, { total: 0, categories: [] })
  assert.equal(getStats([tx('transfer', 5, null)]).isEmpty, true)
  assert.equal(getStats(sample).isEmpty, false)
})

test('only one section filled is not empty', () => {
  const s = getStats([tx('income', 5, 'Salary')])
  assert.equal(s.isEmpty, false)
  assert.deepEqual(s.pengeluaran, { total: 0, categories: [] })
})
