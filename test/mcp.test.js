import { test } from 'node:test'; import assert from 'node:assert/strict'
import { start } from './helpers.js'
import { TOOL_NAMES } from '../src/mcp.js'

const auth = { authorization: 'Bearer tok' }
const rpc = (s, method, params, id = 1, headers = auth, path = '/mcp') => s.call('POST', path, { jsonrpc: '2.0', id, method, params }, headers)
const tool = async (s, name, args) => {
  const r = await rpc(s, 'tools/call', { name, arguments: args })
  const res = r.json.result; return { isError: res.isError, data: JSON.parse(res.content[0].text) }
}

test('mcp: auth via bearer or path secret; wrong/missing -> 401; GET -> 405', async () => {
  const s = await start()
  assert.equal((await rpc(s, 'ping', {}, 1, {})).status, 401)
  assert.equal((await rpc(s, 'ping', {}, 1, { authorization: 'Bearer nope' })).status, 401)
  assert.equal((await rpc(s, 'ping', {}, 1, auth)).status, 200)
  assert.equal((await rpc(s, 'ping', {}, 1, {}, '/mcp/tok')).status, 200)
  assert.equal((await rpc(s, 'ping', {}, 1, {}, '/mcp/wrong')).status, 401)
  assert.equal((await s.call('GET', '/mcp', undefined, auth)).status, 405); s.close()
})

test('mcp: initialize, notification, tools/list covers every tool', async () => {
  const s = await start()
  const init = await rpc(s, 'initialize', { protocolVersion: '2025-03-26' })
  assert.equal(init.json.result.serverInfo.name, 'midas'); assert.ok(init.json.result.capabilities.tools)
  assert.equal((await s.call('POST', '/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' }, auth)).status, 202)
  const list = (await rpc(s, 'tools/list')).json.result.tools
  assert.deepEqual(list.map(t => t.name), TOOL_NAMES)
  for (const n of ['create_account', 'update_account', 'delete_account', 'create_transaction', 'update_category', 'update_recurring', 'get_summary']) assert.ok(TOOL_NAMES.includes(n), n)
  assert.ok(list.every(t => t.description && t.inputSchema.type === 'object')); s.close()
})

test('mcp: account + transaction lifecycle through tools; API errors surface as isError', async () => {
  const s = await start()
  const grp = (await tool(s, 'list_groups', {})).data[0]
  const a = await tool(s, 'create_account', { name: 'MCP-X', group_id: grp.id, type: 'asset', opening_balance: 1000 })
  assert.ok(a.data.id)
  const bal = async () => (await tool(s, 'list_accounts', {})).data.find(x => x.id === a.data.id)
  assert.equal((await bal()).balance, 1000)
  assert.equal((await tool(s, 'update_account', { id: a.data.id, name: 'MCP-Y', opening_balance: 2000 })).data.ok, true)
  assert.equal((await bal()).name, 'MCP-Y'); assert.equal((await bal()).balance, 2000)
  const t = await tool(s, 'create_transaction', { date: '2026-11-01', kind: 'expense', amount: 500, account_id: a.data.id })
  assert.equal((await bal()).balance, 1500)
  assert.equal((await tool(s, 'list_transactions', { month: '2026-11' })).data.length, 1)
  assert.equal((await tool(s, 'list_transactions', { account_id: a.data.id })).data.length, 1)
  await tool(s, 'update_transaction', { id: t.data.id, amount: 100 }); assert.equal((await bal()).balance, 1900)
  const bad = await tool(s, 'create_transaction', { date: 'nope', kind: 'expense', amount: 5, account_id: a.data.id })
  assert.equal(bad.isError, true); assert.match(bad.data.error, /date/)
  await tool(s, 'delete_transaction', { id: t.data.id }); assert.equal((await bal()).balance, 2000)
  assert.equal((await tool(s, 'get_summary', { month: '2026-11' })).data.month, '2026-11')
  await tool(s, 'delete_account', { id: a.data.id }); assert.equal((await tool(s, 'list_accounts', {})).data.find(x => x.id === a.data.id), undefined)
  assert.equal((await rpc(s, 'tools/call', { name: 'nope', arguments: {} })).json.result.isError, true); s.close()
})

test('mcp: categories, groups, recurring tools', async () => {
  const s = await start()
  const c = (await tool(s, 'create_category', { name: 'Hobby', kind: 'expense', monthly_budget: 50000 })).data
  const sub = (await tool(s, 'create_sub_category', { parent_id: c.id, name: 'Games' })).data
  assert.ok(sub.id)
  await tool(s, 'update_category', { id: c.id, name: 'Hobbies' })
  assert.ok((await tool(s, 'list_categories', {})).data.some(x => x.id === c.id && x.name === 'Hobbies'))
  await tool(s, 'delete_category', { id: sub.id })
  const g = (await tool(s, 'create_group', { name: 'TESTGRP', type: 'asset' })).data
  await tool(s, 'update_group', { id: g.id, name: 'TESTGRP2' })
  assert.ok((await tool(s, 'list_groups', {})).data.some(x => x.name === 'TESTGRP2'))
  const acc = (await tool(s, 'create_account', { name: 'R', group_id: g.id, type: 'asset' })).data
  const r = (await tool(s, 'create_recurring', { kind: 'expense', amount: 10000, account_id: acc.id, day_of_month: 5, note: 'sub' })).data
  await tool(s, 'update_recurring', { id: r.id, amount: 20000, active: 0 })
  const rec = (await tool(s, 'list_recurring', {})).data.find(x => x.id === r.id)
  assert.equal(rec.amount, 20000); assert.equal(rec.active, 0)
  await tool(s, 'delete_recurring', { id: r.id }); assert.equal((await tool(s, 'list_recurring', {})).data.length, 0)
  assert.equal((await tool(s, 'delete_group', { id: g.id })).isError, true) // still has account
  assert.deepEqual((await tool(s, 'list_captures', {})).data, []); s.close()
})
