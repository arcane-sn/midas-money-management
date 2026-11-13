import { test } from 'node:test'; import assert from 'node:assert/strict'
await import('../public/categories-view.js')
const V = globalThis.CategoriesView

const cats = [
  { id: 1, name: 'Food', kind: 'expense', parent_id: null },
  { id: 2, name: 'Transport', kind: 'expense', parent_id: null },
  { id: 3, name: 'Salary', kind: 'income', parent_id: null },
  { id: 11, name: 'Lunch', kind: 'expense', parent_id: 1 },
  { id: 12, name: 'Coffee', kind: 'expense', parent_id: 1 },
]

test('switching tab lists only categories of that type', () => {
  const exp = V.render({ cats, type: 'expense' }), inc = V.render({ cats, type: 'income' })
  assert.ok(exp.includes('Food') && exp.includes('Transport') && !exp.includes('Salary'))
  assert.ok(inc.includes('Salary') && !inc.includes('Food'))
  assert.match(inc, /aria-selected="true" data-a="sKind" data-v="income"/)
})

test('badge only when category has subs; sub names listed', () => {
  const html = V.render({ cats, type: 'expense' })
  const [food, transport] = html.split('cat-row').slice(1)
  assert.match(food, /class="badge"[^>]*>2</)
  assert.ok(food.includes('Lunch, Coffee'))
  assert.ok(!transport.includes('badge'))
})

test('empty state when no categories of the type', () => {
  assert.ok(V.render({ cats: [], type: 'income' }).includes('Belum ada kategori'))
})

test('names are escaped; Uncategorized listed last', () => {
  const html = V.render({ cats: [{ id: 9, name: 'Other', kind: 'expense', parent_id: null, is_system: 1 }, { id: 8, name: '<b>', kind: 'expense', parent_id: null }], type: 'expense' })
  assert.ok(html.includes('&lt;b&gt;') && html.indexOf('&lt;b&gt;') < html.indexOf('Other'))
})
