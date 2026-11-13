import { test } from 'node:test'; import assert from 'node:assert/strict'
import { createMonthNav, shiftMonth, prevMonth, nextMonth, canGoNext, formatMonthLabel } from '../src/month-nav.js'

test('defaults to current month, canGoNext false there', () => {
  const n = createMonthNav('2026-11')
  assert.equal(n.month, '2026-11')
  assert.equal(n.canGoNext, false)
})

test('prev then next returns to current; next enables after prev', () => {
  const n = createMonthNav('2026-11')
  assert.equal(n.prev(), '2026-10')
  assert.equal(n.canGoNext, true)
  assert.equal(n.next(), '2026-11')
  assert.equal(n.canGoNext, false)
})

test('next is a no-op on the current month', () => {
  const n = createMonthNav('2026-11')
  assert.equal(n.next(), '2026-11')
})

test('year boundary: Jan <-> Dec', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
  assert.equal(shiftMonth('2025-12', 1), '2026-01')
  assert.equal(shiftMonth('2026-01', -13), '2024-12')
  const n = createMonthNav('2026-01')
  assert.equal(n.prev(), '2025-12')
  assert.equal(n.canGoNext, true)
  assert.equal(n.next(), '2026-01')
  assert.equal(n.canGoNext, false)
})

test('pure helpers: prevMonth / nextMonth / canGoNext respect the current-month limit', () => {
  assert.equal(prevMonth('2026-01'), '2025-12')
  assert.equal(nextMonth('2026-10', '2026-11'), '2026-11')
  assert.equal(nextMonth('2026-11', '2026-11'), '2026-11')
  assert.equal(canGoNext('2026-10', '2026-11'), true)
  assert.equal(canGoNext('2026-11', '2026-11'), false)
})

test('formatMonthLabel uses the app locale (id-ID)', () => {
  assert.equal(formatMonthLabel('2026-11'), 'November 2026')
  assert.equal(formatMonthLabel('2026-01'), 'Januari 2026')
  assert.equal(formatMonthLabel('2026-11', 'en-US'), 'November 2026')
})

test('shared nav instance keeps the selected month across tab switches', () => {
  const nav = createMonthNav('2026-11')
  nav.prev()
  const tabs = { stats: () => nav.month, budget: () => nav.month }
  assert.equal(tabs.budget(), '2026-10')
  assert.equal(tabs.stats(), '2026-10')
})

test('selected month in the future is clamped to current', () => {
  assert.equal(createMonthNav('2026-11', '2027-02').month, '2026-11')
})
