import { test } from 'node:test'; import assert from 'node:assert/strict'
import { getMonthlySummary, groupByDay } from '../src/ledger.js'

const t = (id, date, kind, amount, o = {}) => ({ id, date, kind, amount, ...o })
const data = [
  t(1, '2026-10-31', 'expense', 999),
  t(2, '2026-11-01', 'expense', 100),
  t(3, '2026-11-01', 'income', 1000),
  t(4, '2026-11-15', 'expense', 50, { timestamp: '2026-11-15T08:00:00' }),
  t(5, '2026-11-15', 'expense', 25, { timestamp: '2026-11-15T20:00:00' }),
  t(6, '2026-11-30', 'expense', 10),
  t(7, '2026-12-01', 'income', 777),
  t(8, '2026-11-10', 'transfer', 300),
]

test('summary: spent, income, net; transfers excluded; boundaries respected', () => {
  assert.deepEqual(getMonthlySummary(data, '2026-11'), { spent: 185, income: 1000, net: 815 })
  assert.deepEqual(getMonthlySummary(data, { year: 2026, month: 11 }), { spent: 185, income: 1000, net: 815 })
})

test('summary: empty month is all zero', () => {
  assert.deepEqual(getMonthlySummary(data, '2026-09'), { spent: 0, income: 0, net: 0 })
  assert.deepEqual(getMonthlySummary([], '2026-11'), { spent: 0, income: 0, net: 0 })
})

test('groupByDay: newest day first, boundary days included, other months excluded', () => {
  const g = groupByDay(data, '2026-11')
  assert.deepEqual(g.map(x => x.date), ['2026-11-30', '2026-11-15', '2026-11-10', '2026-11-01'])
})

test('groupByDay: within a day newest first by timestamp, then id', () => {
  const g = groupByDay(data, '2026-11')
  assert.deepEqual(g.find(x => x.date === '2026-11-15').items.map(i => i.id), [5, 4])
  assert.deepEqual(g.find(x => x.date === '2026-11-01').items.map(i => i.id), [3, 2])
})

test('groupByDay: empty month gives no groups', () => {
  assert.deepEqual(groupByDay(data, '2026-09'), [])
})
