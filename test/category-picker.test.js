import { test } from 'node:test'; import assert from 'node:assert/strict'
await import('../public/category-picker.js')
const P = globalThis.CategoryPicker

const cats = [
  { id: 1, name: 'Food', kind: 'expense', parent_id: null },
  { id: 2, name: 'Transport', kind: 'expense', parent_id: null },
  { id: 3, name: 'Salary', kind: 'income', parent_id: null },
  { id: 11, name: 'Lunch', kind: 'expense', parent_id: 1 },
  { id: 12, name: 'Coffee', kind: 'expense', parent_id: 1 },
  { id: 21, name: 'Bus', kind: 'expense', parent_id: 2 },
]

test('categories follow type; transfer has none', () => {
  assert.deepEqual(P.categoryOptions(cats, 'expense').map(c => c.id), [1, 2])
  assert.deepEqual(P.categoryOptions(cats, 'income').map(c => c.id), [3])
  assert.deepEqual(P.categoryOptions(cats, 'transfer'), [])
})
test('sub-categories only of selected category; empty without category', () => {
  assert.deepEqual(P.subOptions(cats, 1).map(c => c.id), [11, 12])
  assert.deepEqual(P.subOptions(cats, 2).map(c => c.id), [21])
  assert.deepEqual(P.subOptions(cats, null), [])
})
test('changing category clears sub-category; same category keeps it', () => {
  let sel = P.selectCategory({ cat: null, sub: null }, 1)
  sel = P.selectSub(sel, 11, cats)
  assert.deepEqual(sel, { cat: 1, sub: 11 })
  assert.deepEqual(P.selectCategory(sel, 1), sel)
  assert.deepEqual(P.selectCategory(sel, 2), { cat: 2, sub: null })
})
test('sub-category toggles and rejects foreign/no-category picks', () => {
  const sel = { cat: 1, sub: 11 }
  assert.equal(P.selectSub(sel, 11, cats).sub, null)
  assert.equal(P.selectSub(sel, 12, cats).sub, 12)
  assert.equal(P.selectSub(sel, 21, cats).sub, 11)
  assert.equal(P.selectSub({ cat: null, sub: null }, 11, cats).sub, null)
})
test('render: category grid, sub chips, error, hidden for transfer', () => {
  const html = P.render({ cats, type: 'expense', cat: 1, sub: 12, error: 'Kategori wajib dipilih.' })
  assert.match(html, /data-nf="cat" data-v="1" aria-pressed="true"/)
  assert.match(html, /data-nf="cat" data-v="2" aria-pressed="false"/)
  assert.doesNotMatch(html, /data-v="3"/)
  assert.match(html, /data-nf="sub" data-v="12" aria-pressed="true"/)
  assert.doesNotMatch(html, /data-v="21"/)
  assert.match(html, /Kategori wajib dipilih\./)
  assert.doesNotMatch(P.render({ cats, type: 'expense', cat: null, sub: null }), /data-nf="sub"/)
  assert.equal(P.render({ cats, type: 'transfer', cat: null, sub: null }), '')
})
