import { test } from 'node:test'; import assert from 'node:assert/strict'
import { start } from './helpers.js'

test('unauthenticated -> 401; bad login -> 401; good login -> 200', async () => {
  const s = await start()
  assert.equal((await s.call('GET', '/api/summary')).status, 401)
  assert.equal((await s.call('POST', '/api/login', { password: 'nope' })).status, 401)
  assert.equal((await s.login()).status, 200)
  assert.equal((await s.call('GET', '/api/summary?month=2026-11')).status, 200); s.close()
})
test('login is rate limited after 10 failures', async () => {
  const s = await start(); let last
  for (let i = 0; i < 12; i++) last = await s.call('POST', '/api/login', { password: 'bad' })
  assert.equal(last.status, 429); assert.equal((await s.login()).status, 429); s.close()
})
test('crud: create account, tx, edit amount updates balance, delete reverts', async () => {
  const s = await start(); await s.login()
  const acc = (await s.call('POST', '/api/accounts', { name: 'X', type: 'asset', opening_balance: 1000 })); assert.equal(acc.status, 201)
  const t = await s.call('POST', '/api/transactions', { date: '2026-11-01', kind: 'expense', amount: 300, account_id: acc.json.id })
  assert.equal(t.status, 201)
  const bal = async () => (await s.call('GET', '/api/summary?month=2026-11')).json.accounts.find(a => a.id === acc.json.id).balance
  assert.equal(await bal(), 700)
  await s.call('PUT', `/api/transactions/${t.json.id}`, { amount: 100 }); assert.equal(await bal(), 900)
  assert.equal((await s.call('DELETE', `/api/transactions/${t.json.id}`)).status, 200); assert.equal(await bal(), 1000)
  assert.equal((await s.call('GET', '/api/transactions?month=2026-11')).json.length, 0); s.close()
})
test('validation: bad amount/date/kind -> 400; transfer needs two different accounts', async () => {
  const s = await start(); await s.login()
  const bad = b => s.call('POST', '/api/transactions', { date: '2026-11-01', kind: 'expense', amount: 5, account_id: 1, ...b })
  assert.equal((await bad({ amount: -5 })).status, 400); assert.equal((await bad({ amount: 1.5 })).status, 400)
  assert.equal((await bad({ date: 'x' })).status, 400); assert.equal((await bad({ kind: 'zzz' })).status, 400)
  assert.equal((await bad({ kind: 'transfer', to_account_id: 1 })).status, 400)
  assert.equal((await bad({ kind: 'transfer', to_account_id: 2 })).status, 201); s.close()
})
test('static: index served, traversal rejected, unknown api 404', async () => {
  const s = await start(); await s.login()
  assert.equal((await s.call('GET', '/')).status, 200)
  assert.notEqual((await s.call('GET', '/..%2f..%2fetc/passwd')).status, 200)
  assert.equal((await s.call('GET', '/api/nope')).status, 404); s.close()
})
