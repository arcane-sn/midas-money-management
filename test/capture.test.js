import { test } from 'node:test'; import assert from 'node:assert/strict'
import { start } from './helpers.js'
import { processCapture } from '../src/capture.js'

const wait = async (fn) => { for (let i = 0; i < 50; i++) { const v = fn(); if (v) return v; await new Promise(r => setTimeout(r, 20)) } }
const post = (s, headers = { authorization: 'Bearer tok' }) => s.call('POST', '/api/capture', new Uint8Array([1, 2, 3]), { 'content-type': 'image/jpeg', ...headers })
const J = o => async () => JSON.stringify(o)
const good = { type: 'expense', amount: 28000, merchant: 'Kopi Kenangan', date: '2026-11-01', account: 'gopay', category: 'Food', subcategory: 'Kopi', confidence: 0.95 }

test('capture needs bearer token; no row without it', async () => {
  const s = await start({ runClaude: J(good) })
  assert.equal((await post(s, {})).status, 401); assert.equal((await post(s, { authorization: 'Bearer x' })).status, 401)
  assert.equal(s.db.prepare('select count(*) c from captures').get().c, 0); s.close()
})
test('valid capture -> 202, then done with auto transaction', async () => {
  const s = await start({ runClaude: J(good) })
  const r = await post(s); assert.equal(r.status, 202)
  const c = await wait(() => { const x = s.db.prepare('select * from captures where id=?').get(r.json.id); return x.status !== 'pending' && x })
  assert.equal(c.status, 'done')
  const t = s.db.prepare('select t.*, c.name cat, a.name acc from transactions t join categories c on c.id=t.category_id join accounts a on a.id=t.account_id').get()
  assert.deepEqual([t.source, t.amount, t.cat, t.acc, t.flag, t.note], ['auto', 28000, 'Kopi', 'GOPAY', null, 'Kopi Kenangan']); s.close()
})
test('low confidence / unknown category or account -> review flag, tx still created', async () => {
  const run = async (o) => {
    const s = await start({ runClaude: J({ ...good, ...o }) }); const r = await post(s)
    const c = await wait(() => { const x = s.db.prepare('select * from captures where id=?').get(r.json.id); return x.status !== 'pending' && x })
    const t = s.db.prepare('select * from transactions').get(); s.close(); return { c, t }
  }
  let x = await run({ confidence: 0.4 }); assert.equal(x.c.status, 'review'); assert.equal(x.t.flag, 'review')
  x = await run({ category: 'Nonsense', subcategory: '' }); assert.equal(x.t.category_id, null); assert.equal(x.t.flag, 'review')
  x = await run({ account: 'Mystery' }); assert.equal(x.t.account_id, null); assert.equal(x.t.flag, 'review')
})
test('code-fenced JSON is accepted', async () => {
  const s = await start({ runClaude: async () => '```json\n' + JSON.stringify(good) + '\n```' }); const r = await post(s)
  const c = await wait(() => { const x = s.db.prepare('select * from captures where id=?').get(r.json.id); return x.status !== 'pending' && x })
  assert.equal(c.status, 'done'); s.close()
})
test('garbage / throw / bad amount -> failed, no transaction, no crash', async () => {
  for (const run of [async () => 'sorry no', async () => { throw new Error('timeout') }, J({ ...good, amount: 0 })]) {
    const s = await start({ runClaude: run }); const r = await post(s)
    const c = await wait(() => { const x = s.db.prepare('select * from captures where id=?').get(r.json.id); return x.status !== 'pending' && x })
    assert.equal(c.status, 'failed'); assert.equal(s.db.prepare('select count(*) c from transactions').get().c, 0); s.close()
  }
})
